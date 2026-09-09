from datetime import datetime
from pydantic import BaseModel, Field


class ExpiryPredictRequest(BaseModel):
    batch_id: str = Field(alias="batchId")
    current_quantity: int = Field(alias="currentQuantity")
    manufacturing_date: datetime = Field(alias="manufacturingDate")
    expiry_date: datetime = Field(alias="expiryDate")
    total_units_moved: int = Field(default=0, alias="totalUnitsMoved")
    days_in_circulation: int = Field(default=1, alias="daysInCirculation")

    model_config = {"populate_by_name": True}


class ExpiryPredictResponse(BaseModel):
    batch_id: str = Field(alias="batchId")
    current_quantity: int = Field(alias="currentQuantity")
    days_to_expiry: int = Field(alias="daysToExpiry")
    predicted_movement_before_expiry: int = Field(alias="predictedMovementBeforeExpiry")
    estimated_remaining_quantity: int = Field(alias="estimatedRemainingQuantity")
    remaining_percentage: float = Field(alias="remainingPercentage")
    risk_level: str = Field(alias="riskLevel")
    explanation: str
    has_sufficient_data: bool = Field(alias="hasSufficientData")
    daily_burn_rate: float = Field(alias="dailyBurnRate")

    model_config = {"populate_by_name": True}
