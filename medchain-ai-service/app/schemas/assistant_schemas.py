from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AssistantQueryRequest(BaseModel):
    query: str
    user_role: str = Field(alias="userRole")
    organization_name: Optional[str] = Field(default=None, alias="organizationName")
    batches: List[Dict[str, Any]] = Field(default_factory=list)
    alerts: List[Dict[str, Any]] = Field(default_factory=list)
    transfers: List[Dict[str, Any]] = Field(default_factory=list)
    anomalies: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class AssistantQueryResponse(BaseModel):
    answer_markdown: str = Field(alias="answerMarkdown")
    referenced_batch_ids: List[str] = Field(default_factory=list, alias="referencedBatchIds")
    referenced_org_ids: List[str] = Field(default_factory=list, alias="referencedOrgIds")
    suggested_actions: List[str] = Field(default_factory=list, alias="suggestedActions")

    model_config = {"populate_by_name": True}
