from datetime import datetime, timezone
from app.schemas.expiry_schemas import ExpiryPredictRequest, ExpiryPredictResponse


def estimate_expiry_risk(req: ExpiryPredictRequest) -> ExpiryPredictResponse:
    now = datetime.now(timezone.utc)
    exp = req.expiry_date
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    days_to_expiry = max(0, (exp - now).days)
    days_in_circulation = max(1, req.days_in_circulation)

    if req.total_units_moved > 0:
        daily_burn_rate = req.total_units_moved / float(days_in_circulation)
        has_sufficient_data = True
    else:
        # If no units have moved yet, we cannot accurately project empirical depletion
        daily_burn_rate = 0.0
        has_sufficient_data = False

    if has_sufficient_data and daily_burn_rate > 0:
        predicted_movement = int(round(daily_burn_rate * days_to_expiry))
        estimated_remaining = max(0, req.current_quantity - predicted_movement)
        rem_pct = (estimated_remaining / req.current_quantity * 100.0) if req.current_quantity > 0 else 0.0

        if days_to_expiry <= 30 and rem_pct > 30.0:
            risk_level = "CRITICAL"
        elif rem_pct >= 40.0 or (days_to_expiry <= 60 and rem_pct > 15.0):
            risk_level = "HIGH"
        elif rem_pct >= 15.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        explanation = (
            f"At historical depletion rate of {daily_burn_rate:.1f} units/day, "
            f"approximately {predicted_movement} units will be dispensed over the remaining {days_to_expiry} days. "
            f"An estimated {estimated_remaining} units ({rem_pct:.1f}%) may remain unused before expiry."
        )
    else:
        # Fallback based strictly on shelf life proximity when zero units have moved yet
        estimated_remaining = req.current_quantity
        predicted_movement = 0
        rem_pct = 100.0 if req.current_quantity > 0 else 0.0

        if days_to_expiry <= 30:
            risk_level = "CRITICAL"
        elif days_to_expiry <= 90:
            risk_level = "HIGH"
        elif days_to_expiry <= 180:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        explanation = (
            f"Zero historical outbound movement recorded for this batch. "
            f"Batch expires in {days_to_expiry} days. Entire current stock ({req.current_quantity} units) "
            f"is currently at risk of expiring if not dispatched."
        )

    return ExpiryPredictResponse(
        batchId=req.batch_id,
        currentQuantity=req.current_quantity,
        daysToExpiry=days_to_expiry,
        predictedMovementBeforeExpiry=predicted_movement,
        estimatedRemainingQuantity=estimated_remaining,
        remainingPercentage=round(rem_pct, 1),
        riskLevel=risk_level,
        explanation=explanation,
        hasSufficientData=has_sufficient_data,
        dailyBurnRate=round(daily_burn_rate, 2),
    )
