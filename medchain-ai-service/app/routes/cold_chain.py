from fastapi import APIRouter
from app.schemas.cold_chain_schemas import ColdChainAnalyzeRequest, ColdChainAnalyzeResponse
from app.services.cold_chain_analyzer import analyze_cold_chain

router = APIRouter(prefix="/ai/cold-chain", tags=["Cold-Chain Anomaly Analysis"])


@router.post("/analyze", response_model=ColdChainAnalyzeResponse, response_model_by_alias=True)
def analyze_cold_chain_route(req: ColdChainAnalyzeRequest):
    return analyze_cold_chain(req)
