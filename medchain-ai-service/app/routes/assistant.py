from fastapi import APIRouter
from app.schemas.assistant_schemas import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant_agent import process_assistant_query

router = APIRouter(prefix="/ai/assistant", tags=["Supply-Chain AI Assistant"])


@router.post("/query", response_model=AssistantQueryResponse, response_model_by_alias=True)
def query_assistant(req: AssistantQueryRequest):
    return process_assistant_query(req)
