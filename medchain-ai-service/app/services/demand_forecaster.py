import pandas as pd
import numpy as np
from app.schemas.demand_schemas import DemandPredictRequest, DemandPredictResponse


def forecast_demand(req: DemandPredictRequest) -> DemandPredictResponse:
    sample_count = len(req.history)

    if sample_count < 3:
        return DemandPredictResponse(
            medicineName=req.medicine_name,
            currentStock=req.current_stock,
            predictedDemand7d=0,
            predictedDemand30d=0,
            predictedDemand90d=0,
            recommendedStock=req.current_stock,
            shortageRisk=False,
            overstockRisk=False,
            confidence=0.0,
            modelType="linear-trend-v1.0",
            sampleCount=sample_count,
            hasSufficientData=False,
            explanation=(
                f"Insufficient historical data for demand forecasting. Received {sample_count} historical "
                f"data point(s); a minimum of 3 observations is required to establish demand velocity."
            ),
        )

    # Convert to pandas series
    df = pd.DataFrame([
        {"timestamp": p.timestamp, "quantity": p.quantity}
        for p in req.history
    ])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp")

    # Compute daily consumption rate
    total_qty = df["quantity"].sum()
    time_span = (df["timestamp"].iloc[-1] - df["timestamp"].iloc[0]).total_seconds() / 86400.0
    days_span = max(1.0, time_span)

    # Weighted recent velocity
    daily_rate = total_qty / days_span

    # If more than 5 points, compute linear regression slope
    if sample_count >= 5:
        df["day_index"] = (df["timestamp"] - df["timestamp"].iloc[0]).dt.total_seconds() / 86400.0
        # Linear fit: y = mx + c
        poly = np.polyfit(df["day_index"], df["quantity"], deg=1)
        slope = poly[0]
        # Adjust daily rate by trend if positive
        adjusted_daily_rate = max(0.1, daily_rate + slope * 0.5)
        model_type = "linear-trend-regression-v1.0"
        confidence = min(0.90, 0.55 + (sample_count * 0.03))
    else:
        adjusted_daily_rate = max(0.1, daily_rate)
        model_type = "rolling-average-velocity-v1.0"
        confidence = min(0.75, 0.40 + (sample_count * 0.05))

    p7 = int(round(adjusted_daily_rate * 7))
    p30 = int(round(adjusted_daily_rate * 30))
    p90 = int(round(adjusted_daily_rate * 90))

    # Recommended stock includes a 20% safety buffer over 30-day demand
    recommended_stock = int(round(p30 * 1.20))

    shortage_risk = req.current_stock < p30
    overstock_risk = req.current_stock > max(100, int(p90 * 2.0))

    explanation = (
        f"Based on {sample_count} historical movements over {days_span:.1f} days, "
        f"average daily consumption is {adjusted_daily_rate:.1f} units. "
        f"Projected 30-day requirement: {p30} units. Current inventory: {req.current_stock} units."
    )

    return DemandPredictResponse(
        medicineName=req.medicine_name,
        currentStock=req.current_stock,
        predictedDemand7d=p7,
        predictedDemand30d=p30,
        predictedDemand90d=p90,
        recommendedStock=recommended_stock,
        shortageRisk=shortage_risk,
        overstockRisk=overstock_risk,
        confidence=round(confidence, 2),
        modelType=model_type,
        sampleCount=sample_count,
        hasSufficientData=True,
        explanation=explanation,
    )
