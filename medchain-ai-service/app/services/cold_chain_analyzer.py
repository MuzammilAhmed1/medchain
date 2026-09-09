import numpy as np
from app.schemas.cold_chain_schemas import ColdChainAnalyzeRequest, ColdChainAnalyzeResponse


def analyze_cold_chain(req: ColdChainAnalyzeRequest) -> ColdChainAnalyzeResponse:
    if not req.readings:
        return ColdChainAnalyzeResponse(
            batchId=req.batch_id,
            excursionDetected=False,
            durationMinutes=0,
            maxTemperature=0.0,
            minTemperature=0.0,
            fluctuationRate=0.0,
            degreeMinutesExcursion=0.0,
            spoilageRisk="LOW",
            reason="No sensor readings submitted for cold-chain excursion evaluation.",
        )

    temps = [r.temperature for r in req.readings]
    max_t = float(max(temps))
    min_t = float(min(temps))
    fluctuation = float(np.std(temps)) if len(temps) > 1 else 0.0

    # Sort by timestamp
    sorted_readings = sorted(req.readings, key=lambda x: x.timestamp)

    total_excursion_seconds = 0.0
    degree_minutes = 0.0
    excursion_points = []

    for i in range(len(sorted_readings)):
        r = sorted_readings[i]
        t = r.temperature
        is_excursion = (t < req.min_permitted) or (t > req.max_permitted)

        if is_excursion:
            excursion_points.append(t)
            # Estimate interval to next reading or default 5 mins (300s)
            if i + 1 < len(sorted_readings):
                delta_sec = (sorted_readings[i+1].timestamp - r.timestamp).total_seconds()
                interval_sec = max(60.0, min(1800.0, delta_sec))
            else:
                interval_sec = 300.0

            total_excursion_seconds += interval_sec
            excess = (t - req.max_permitted) if t > req.max_permitted else (req.min_permitted - t)
            degree_minutes += excess * (interval_sec / 60.0)

    duration_minutes = int(round(total_excursion_seconds / 60.0))
    excursion_detected = len(excursion_points) > 0

    if not excursion_detected:
        spoilage_risk = "LOW"
        reason = (
            f"All {len(req.readings)} temperature telemetry readings remained within safe threshold "
            f"({req.min_permitted}°C – {req.max_permitted}°C). Peak: {max_t:.1f}°C, Low: {min_t:.1f}°C."
        )
    else:
        if degree_minutes >= 120.0 or duration_minutes >= 60 or max_t >= 15.0 or min_t <= -3.0:
            spoilage_risk = "CRITICAL"
            reason = (
                f"Severe cold-chain breach detected: temperature reached {max_t:.1f}°C / {min_t:.1f}°C "
                f"outside allowed ({req.min_permitted}°C – {req.max_permitted}°C) for {duration_minutes} minutes "
                f"({degree_minutes:.1f} degree-minutes). High probability of protein denaturation/loss of potency."
            )
        elif degree_minutes >= 30.0 or duration_minutes >= 20 or max_t >= 10.0:
            spoilage_risk = "HIGH"
            reason = (
                f"Significant temperature excursion: peak {max_t:.1f}°C exceeded safe maximum for "
                f"{duration_minutes} minutes ({degree_minutes:.1f} degree-minutes)."
            )
        else:
            spoilage_risk = "MEDIUM"
            reason = (
                f"Minor temperature excursion: outside permitted range for {duration_minutes} minutes "
                f"({degree_minutes:.1f} degree-minutes). Monitoring recommended."
            )

    return ColdChainAnalyzeResponse(
        batchId=req.batch_id,
        excursionDetected=excursion_detected,
        durationMinutes=duration_minutes,
        maxTemperature=round(max_t, 2),
        minTemperature=round(min_t, 2),
        fluctuationRate=round(fluctuation, 2),
        degreeMinutesExcursion=round(degree_minutes, 2),
        spoilageRisk=spoilage_risk,
        reason=reason,
    )
