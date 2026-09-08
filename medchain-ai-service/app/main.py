from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import BatchRiskRequest, RiskAnalysisResponse
from app.risk_engine import analyze_batch

app = FastAPI(
    title="MedChain AI Risk Service",
    description="Rule-based Medicine Supply Risk Analysis for the MedChain MVP.",
    version="0.1.0",
)

# The Spring Boot backend calls this service server-to-server in production;
# CORS is left open here only so it can also be hit directly from a local
# browser/dev tool while wiring things up.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/risk/analyze", response_model=RiskAnalysisResponse, response_model_by_alias=True)
def analyze(request: BatchRiskRequest):
    return analyze_batch(request)
