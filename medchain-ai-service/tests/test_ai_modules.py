from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_fraud_analysis_insufficient_data():
    payload = {
        "batchId": "MC-2026-00001",
        "hopCount": 2,
        "avgIntervalHours": 24.0,
        "verificationFailureCount": 0,
        "qtyDelta": 0,
        "isRouteSuspicious": False,
        "historicalBatches": [
            {"batch_id": "MC-2026-00000", "hop_count": 2, "avg_interval_hours": 20.0, "verification_failure_count": 0, "qty_delta": 0}
        ]
    }
    res = client.post("/ai/fraud/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["batchId"] == "MC-2026-00001"
    assert data["hasSufficientData"] is False
    assert data["sampleCount"] == 1
    assert "Insufficient historical data" in data["explanation"]


def test_fraud_analysis_sufficient_data_isolation_forest():
    # 6 historical batches
    historical = [
        {"batch_id": f"MC-HIST-{i}", "hop_count": 2, "avg_interval_hours": 24.0, "verification_failure_count": 0, "qty_delta": 0}
        for i in range(6)
    ]
    payload = {
        "batchId": "MC-2026-00002",
        "hopCount": 7,
        "avgIntervalHours": 0.2,
        "verificationFailureCount": 3,
        "qtyDelta": -50,
        "isRouteSuspicious": True,
        "historicalBatches": historical
    }
    res = client.post("/ai/fraud/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["hasSufficientData"] is True
    assert data["sampleCount"] == 6
    assert data["modelVersion"] == "isolation-forest-v1.0"
    assert data["fraudScore"] >= 50
    assert data["riskLevel"] in ["MEDIUM", "HIGH"]
    assert len(data["detectedReasons"]) > 0


def test_demand_forecasting_insufficient_data():
    payload = {
        "medicineName": "Amoxicillin 500mg",
        "currentStock": 500,
        "history": [
            {"timestamp": datetime.now(timezone.utc).isoformat(), "quantity": 100}
        ]
    }
    res = client.post("/ai/demand/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["hasSufficientData"] is False
    assert "Insufficient historical data" in data["explanation"]
    assert data["predictedDemand30d"] == 0


def test_demand_forecasting_sufficient_data():
    now = datetime.now(timezone.utc)
    history = [
        {"timestamp": (now - timedelta(days=30)).isoformat(), "quantity": 200},
        {"timestamp": (now - timedelta(days=20)).isoformat(), "quantity": 250},
        {"timestamp": (now - timedelta(days=10)).isoformat(), "quantity": 300},
        {"timestamp": now.isoformat(), "quantity": 350},
    ]
    payload = {
        "medicineName": "Paracetamol 500mg",
        "currentStock": 200,
        "history": history
    }
    res = client.post("/ai/demand/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["hasSufficientData"] is True
    assert data["predictedDemand7d"] > 0
    assert data["predictedDemand30d"] > 0
    assert data["predictedDemand90d"] > data["predictedDemand30d"]
    assert data["shortageRisk"] is True  # currentStock 200 < predicted 30d


def test_expiry_prediction():
    now = datetime.now(timezone.utc)
    payload = {
        "batchId": "MC-2026-00003",
        "currentQuantity": 5000,
        "manufacturingDate": (now - timedelta(days=100)).isoformat(),
        "expiryDate": (now + timedelta(days=45)).isoformat(),
        "totalUnitsMoved": 2000,
        "daysInCirculation": 100
    }
    res = client.post("/ai/expiry/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["batchId"] == "MC-2026-00003"
    assert data["daysToExpiry"] in [44, 45]
    assert data["dailyBurnRate"] == 20.0
    assert data["predictedMovementBeforeExpiry"] == int(data["dailyBurnRate"] * data["daysToExpiry"])
    assert data["estimatedRemainingQuantity"] == 5000 - data["predictedMovementBeforeExpiry"]
    assert data["riskLevel"] in ["HIGH", "CRITICAL"]


def test_cold_chain_normal_and_excursion():
    now = datetime.now(timezone.utc)
    # Normal readings
    normal_payload = {
        "batchId": "MC-2026-00004",
        "minPermitted": 2.0,
        "maxPermitted": 8.0,
        "readings": [
            {"timestamp": (now - timedelta(minutes=10)).isoformat(), "temperature": 4.5, "humidity": 50.0},
            {"timestamp": (now - timedelta(minutes=5)).isoformat(), "temperature": 4.8, "humidity": 52.0},
            {"timestamp": now.isoformat(), "temperature": 4.6, "humidity": 51.0},
        ]
    }
    res = client.post("/ai/cold-chain/analyze", json=normal_payload)
    assert res.status_code == 200
    assert res.json()["excursionDetected"] is False
    assert res.json()["spoilageRisk"] == "LOW"

    # Spike reading
    spike_payload = {
        "batchId": "MC-2026-00004",
        "minPermitted": 2.0,
        "maxPermitted": 8.0,
        "readings": [
            {"timestamp": (now - timedelta(minutes=30)).isoformat(), "temperature": 4.5},
            {"timestamp": (now - timedelta(minutes=20)).isoformat(), "temperature": 11.5},
            {"timestamp": (now - timedelta(minutes=10)).isoformat(), "temperature": 12.0},
            {"timestamp": now.isoformat(), "temperature": 11.8},
        ]
    }
    res_spike = client.post("/ai/cold-chain/analyze", json=spike_payload)
    assert res_spike.status_code == 200
    spike_data = res_spike.json()
    assert spike_data["excursionDetected"] is True
    assert spike_data["maxTemperature"] == 12.0
    assert spike_data["spoilageRisk"] in ["HIGH", "CRITICAL"]


def test_assistant_query():
    payload = {
        "query": "Which batches are high risk?",
        "userRole": "MANUFACTURER",
        "organizationName": "PharmaCorp",
        "batches": [
            {
                "id": "MC-2026-00005",
                "medicineName": "Para",
                "quantity": 1000,
                "status": "VERIFIED",
                "riskScore": 85,
                "riskLevel": "HIGH",
                "expiryDate": "2027-01-01",
                "currentOwner": {"name": "PharmaCorp"}
            }
        ],
        "alerts": [],
        "transfers": [],
        "anomalies": []
    }
    res = client.post("/ai/assistant/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "MC-2026-00005" in data["answerMarkdown"]
    assert "MC-2026-00005" in data["referencedBatchIds"]
