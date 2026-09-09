from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import BatchRiskRequest, RiskAnalysisResponse
from app.risk_engine import analyze_batch

from app.routes.fraud import router as fraud_router
from app.routes.demand import router as demand_router
from app.routes.expiry import router as expiry_router
from app.routes.cold_chain import router as cold_chain_router
from app.routes.assistant import router as assistant_router

app = FastAPI(
    title="MedChain AI Microservice",
    description="Production-grade AI microservice providing Fraud Detection, Demand Forecasting, Expiry Estimation, Cold-Chain Telemetry Analytics, and Assistant Intelligence for MedChain.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "medchain-ai-service", "version": "1.0.0"}


# Backward-compatible baseline risk endpoint
@app.post("/risk/analyze", response_model=RiskAnalysisResponse, response_model_by_alias=True)
def analyze(request: BatchRiskRequest):
    return analyze_batch(request)


# New AI Microservice modules
app.include_router(fraud_router)
app.include_router(demand_router)
app.include_router(expiry_router)
app.include_router(cold_chain_router)
app.include_router(assistant_router)
