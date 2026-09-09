from fastapi import APIRouter
from app.schemas.fraud_schemas import FraudAnalysisRequest, FraudAnalysisResponse
from app.services.fraud_detector import detect_fraud_anomaly

router = APIRouter(prefix="/ai/fraud", tags=["Fraud & Anomaly Detection"])


@router.post("/analyze", response_model=FraudAnalysisResponse, response_model_by_alias=True)
def analyze_fraud(req: FraudAnalysisRequest):
    return detect_fraud_anomaly(req)
