from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class HistoricalDemandPoint(BaseModel):
    timestamp: datetime
    quantity: int


class DemandPredictRequest(BaseModel):
    medicine_name: str = Field(alias="medicineName")
    current_stock: int = Field(alias="currentStock")
    history: List[HistoricalDemandPoint] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class DemandPredictResponse(BaseModel):
    medicine_name: str = Field(alias="medicineName")
    current_stock: int = Field(alias="currentStock")
    predicted_demand_7d: int = Field(alias="predictedDemand7d")
    predicted_demand_30d: int = Field(alias="predictedDemand30d")
    predicted_demand_90d: int = Field(alias="predictedDemand90d")
    recommended_stock: int = Field(alias="recommendedStock")
    shortage_risk: bool = Field(alias="shortageRisk")
    overstock_risk: bool = Field(alias="overstockRisk")
    confidence: float
    model_type: str = Field(alias="modelType")
    sample_count: int = Field(alias="sampleCount")
    has_sufficient_data: bool = Field(alias="hasSufficientData")
    explanation: str

    model_config = {"populate_by_name": True}
