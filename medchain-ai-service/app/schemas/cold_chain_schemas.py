from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SensorReadingPoint(BaseModel):
    timestamp: datetime
    temperature: float
    humidity: Optional[float] = None


class ColdChainAnalyzeRequest(BaseModel):
    batch_id: str = Field(alias="batchId")
    min_permitted: float = Field(default=2.0, alias="minPermitted")
    max_permitted: float = Field(default=8.0, alias="maxPermitted")
    readings: List[SensorReadingPoint] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class ColdChainAnalyzeResponse(BaseModel):
    batch_id: str = Field(alias="batchId")
    excursion_detected: bool = Field(alias="excursionDetected")
    duration_minutes: int = Field(alias="durationMinutes")
    max_temperature: float = Field(alias="maxTemperature")
    min_temperature: float = Field(alias="minTemperature")
    fluctuation_rate: float = Field(alias="fluctuationRate")
    degree_minutes_excursion: float = Field(alias="degreeMinutesExcursion")
    spoilage_risk: str = Field(alias="spoilageRisk")
    reason: str

    model_config = {"populate_by_name": True}
