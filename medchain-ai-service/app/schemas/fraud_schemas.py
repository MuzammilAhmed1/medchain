from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class HistoricalBatchFeature(BaseModel):
    batch_id: str
    hop_count: int
    avg_interval_hours: float
    verification_failure_count: int = 0
    qty_delta: int = 0


class FraudAnalysisRequest(BaseModel):
    batch_id: str = Field(alias="batchId")
    hop_count: int = Field(alias="hopCount")
    avg_interval_hours: float = Field(alias="avgIntervalHours")
    verification_failure_count: int = Field(default=0, alias="verificationFailureCount")
    qty_delta: int = Field(default=0, alias="qtyDelta")
    is_route_suspicious: bool = Field(default=False, alias="isRouteSuspicious")
    historical_batches: List[HistoricalBatchFeature] = Field(default_factory=list, alias="historicalBatches")

    model_config = {"populate_by_name": True}


class FraudAnalysisResponse(BaseModel):
    batch_id: str = Field(alias="batchId")
    fraud_score: int = Field(alias="fraudScore")
    risk_level: str = Field(alias="riskLevel")
    detected_reasons: List[str] = Field(default_factory=list, alias="detectedReasons")
    contributing_factors: Dict[str, float] = Field(default_factory=dict, alias="contributingFactors")
    confidence: float
    model_version: str = Field(alias="modelVersion")
    has_sufficient_data: bool = Field(alias="hasSufficientData")
    sample_count: int = Field(alias="sampleCount")
    explanation: str

    model_config = {"populate_by_name": True}
