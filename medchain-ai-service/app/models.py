from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TransferRecord(BaseModel):
    """One hop in the batch's custody chain."""

    from_org: str = Field(alias="from")
    to_org: str = Field(alias="to")
    initiated_at: datetime = Field(alias="initiatedAt")
    received_at: Optional[datetime] = Field(default=None, alias="receivedAt")

    model_config = {"populate_by_name": True}


class BlockchainEventRecord(BaseModel):
    type: str
    timestamp: datetime


class BatchRiskRequest(BaseModel):
    """Everything the engine needs to score one batch. Mirrors the shape
    the Spring Boot batch service holds, so it can be forwarded as-is."""

    batch_id: str = Field(alias="batchId")
    status: str
    manufacturing_date: datetime = Field(alias="manufacturingDate")
    expiry_date: datetime = Field(alias="expiryDate")
    transfers: List[TransferRecord] = Field(default_factory=list)
    blockchain_events: List[BlockchainEventRecord] = Field(
        default_factory=list, alias="blockchainEvents"
    )
    as_of: Optional[datetime] = Field(default=None, alias="asOf")

    model_config = {"populate_by_name": True}


class TriggeredRule(BaseModel):
    code: str
    points: int
    message: str


class RiskAnalysisResponse(BaseModel):
    batch_id: str = Field(serialization_alias="batchId")
    risk_score: int = Field(serialization_alias="riskScore")
    risk_level: RiskLevel = Field(serialization_alias="riskLevel")
    reason: str
    recommendation: str
    triggered_rules: List[TriggeredRule] = Field(serialization_alias="triggeredRules")

    model_config = {"populate_by_name": True}
