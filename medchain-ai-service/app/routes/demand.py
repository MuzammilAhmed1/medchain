from fastapi import APIRouter
from app.schemas.demand_schemas import DemandPredictRequest, DemandPredictResponse
from app.services.demand_forecaster import forecast_demand

router = APIRouter(prefix="/ai/demand", tags=["Demand Forecasting"])


@router.post("/predict", response_model=DemandPredictResponse, response_model_by_alias=True)
def predict_demand(req: DemandPredictRequest):
    return forecast_demand(req)
