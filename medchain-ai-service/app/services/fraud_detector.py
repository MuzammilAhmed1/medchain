import numpy as np
from sklearn.ensemble import IsolationForest
from app.schemas.fraud_schemas import FraudAnalysisRequest, FraudAnalysisResponse


def detect_fraud_anomaly(req: FraudAnalysisRequest) -> FraudAnalysisResponse:
    target_vec = np.array([
        req.hop_count,
        req.avg_interval_hours,
        req.verification_failure_count,
        req.qty_delta,
    ], dtype=float)

    sample_count = len(req.historical_batches)
    reasons = []
    contributing_factors = {
        "hop_factor": 0.0,
        "interval_factor": 0.0,
        "verification_failure_factor": 0.0,
        "qty_delta_factor": 0.0,
    }

    # Deterministic heuristics for factor evaluation
    if req.hop_count >= 5:
        reasons.append(f"Excessive custody transfers ({req.hop_count} hops detected)")
        contributing_factors["hop_factor"] = min(1.0, req.hop_count / 8.0)
    elif req.hop_count >= 3:
        contributing_factors["hop_factor"] = 0.4

    if req.avg_interval_hours > 0 and req.avg_interval_hours < 0.5:
        reasons.append(f"Abnormally rapid transfer interval ({req.avg_interval_hours:.1f} hours)")
        contributing_factors["interval_factor"] = 0.8
    elif req.avg_interval_hours > 720:  # > 30 days in single hop
        reasons.append(f"Stagnant custody interval ({req.avg_interval_hours / 24:.1f} days without receipt)")
        contributing_factors["interval_factor"] = 0.7

    if req.verification_failure_count > 0:
        reasons.append(f"Repeated verification check failures ({req.verification_failure_count} recorded)")
        contributing_factors["verification_failure_factor"] = min(1.0, req.verification_failure_count * 0.3)

    if req.qty_delta != 0:
        reasons.append(f"Quantity mismatch during transit ({abs(req.qty_delta)} unit discrepancy)")
        contributing_factors["qty_delta_factor"] = min(1.0, abs(req.qty_delta) / 100.0)

    if req.is_route_suspicious:
        reasons.append("Unusual organization routing or circular transfer route detected")

    # If we have at least 5 historical batches, run an actual IsolationForest model
    if sample_count >= 5:
        historical_matrix = np.array([
            [b.hop_count, b.avg_interval_hours, b.verification_failure_count, b.qty_delta]
            for b in req.historical_batches
        ], dtype=float)

        all_data = np.vstack([historical_matrix, target_vec])
        model = IsolationForest(contamination=0.1, random_state=42)
        model.fit(all_data)

        # score_samples returns negative anomaly score (lower is more anomalous)
        raw_score = model.score_samples([target_vec])[0]
        # Map raw score roughly [-0.7, 0.0] to [100, 0]
        # In sklearn, normal points are near 0.0 or slightly negative; anomalies are <= -0.5
        normalized_anomaly = max(0.0, min(1.0, (-raw_score - 0.2) / 0.4))
        score = int(normalized_anomaly * 100)

        # Combine model score with observed hard violations
        heuristic_bonus = int(sum(contributing_factors.values()) * 15)
        fraud_score = min(100, max(score, heuristic_bonus))
        confidence = round(min(0.95, 0.60 + (sample_count * 0.02)), 2)
        model_version = "isolation-forest-v1.0"
        has_sufficient_data = True
        explanation = f"Evaluated via Isolation Forest trained on {sample_count} historical custody chains."
    else:
        # Transparent statistical baseline with clear insufficient data flag
        has_sufficient_data = False
        model_version = "statistical-baseline-v1.0"
        confidence = 0.50
        # Calculate transparent score from contributing factors
        raw_calc = (
            contributing_factors["hop_factor"] * 30 +
            contributing_factors["interval_factor"] * 25 +
            contributing_factors["verification_failure_factor"] * 30 +
            contributing_factors["qty_delta_factor"] * 15 +
            (15 if req.is_route_suspicious else 0)
        )
        fraud_score = min(100, int(raw_calc))
        explanation = (
            f"Insufficient historical data for Isolation Forest training (found {sample_count} batches, "
            f"minimum required: 5). Evaluated via multi-factor statistical rule bounds."
        )

    if fraud_score >= 70:
        risk_level = "HIGH"
    elif fraud_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    if not reasons:
        reasons.append("Chain-of-custody transfer velocity and verification checks conform to normal ranges")

    return FraudAnalysisResponse(
        batchId=req.batch_id,
        fraudScore=fraud_score,
        riskLevel=risk_level,
        detectedReasons=reasons,
        contributingFactors=contributing_factors,
        confidence=confidence,
        modelVersion=model_version,
        hasSufficientData=has_sufficient_data,
        sampleCount=sample_count,
        explanation=explanation,
    )
