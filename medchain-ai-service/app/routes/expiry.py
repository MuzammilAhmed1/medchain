from fastapi import APIRouter
from app.schemas.expiry_schemas import ExpiryPredictRequest, ExpiryPredictResponse
from app.services.expiry_estimator import estimate_expiry_risk

router = APIRouter(prefix="/ai/expiry", tags=["Expiry Risk Estimation"])


@router.post("/predict", response_model=ExpiryPredictResponse, response_model_by_alias=True)
def predict_expiry(req: ExpiryPredictRequest):
    return estimate_expiry_risk(req)
