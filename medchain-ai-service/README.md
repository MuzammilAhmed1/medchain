# MedChain AI Risk Service

A small FastAPI service implementing **Medicine Supply Risk Analysis** —
Feature 7 from the MVP brief. This is a rule-based engine, not a trained
model: at the data volume a real MVP deployment has (a handful of transfers
per batch), a hand-tuned, auditable rule set is more reliable and more
explainable than a model that would be undertrained on so little data.
`app/risk_engine.py` documents why up top, and every rule is independently
unit-tested in `tests/test_risk_engine.py`.

## Run it

```
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run the tests:

```
pytest tests/ -v
```

## API

### `GET /health`
Returns `{"status": "ok"}`.

### `POST /risk/analyze`
Request body (matches what the Spring Boot batch service holds for a batch):

```json
{
  "batchId": "MC-2026-00131",
  "status": "IN_TRANSIT",
  "manufacturingDate": "2026-02-02T08:00:00Z",
  "expiryDate": "2028-02-02T08:00:00Z",
  "transfers": [
    { "from": "NovaMed Labs", "to": "PharmaLink Logistics", "initiatedAt": "2026-02-04T12:00:00Z" }
  ],
  "blockchainEvents": [
    { "type": "BATCH_CREATED", "timestamp": "2026-02-02T08:00:00Z" }
  ],
  "asOf": "2026-03-01T00:00:00Z"
}
```

`asOf` is optional — omit it to score against the current time. `receivedAt`
on a transfer is optional; leave it out to represent a transfer still in
progress.

Response:

```json
{
  "batchId": "MC-2026-00131",
  "riskScore": 35,
  "riskLevel": "MEDIUM",
  "reason": "A transfer has been in transit for over 24 days without confirmation.",
  "recommendation": "Contact the current custodian to confirm shipment status without delay.",
  "triggeredRules": [
    { "code": "PENDING_TRANSFER_SEVERE_DELAY", "points": 35, "message": "..." }
  ]
}
```

## The five rules

| Rule | Triggers when | Points |
|---|---|---|
| `RECALLED` | Batch status is `RECALLED` | 90 |
| `PENDING_TRANSFER_(SEVERE_)DELAY` | A transfer has sat unreceived for 48h+ / 120h+ | 15 / 35 |
| `OWNERSHIP_HOP_FREQUENCY` | 3+ ownership changes within 72 hours | 20 |
| `EXPIRY_APPROACHING` / `_IMMINENT` / `EXPIRED_STOCK` | Non-verified batch within 90/30/0 days of expiry | 15 / 25 / 40 |
| `MISSING_BLOCKCHAIN_CONFIRMATION` | A transfer has no matching blockchain event within 24h | 10 per missing event, capped at 20 |

Score is the sum of triggered rules, capped at 100. `riskLevel` is `LOW`
below 34, `MEDIUM` from 34–69, `HIGH` at 70+. `reason`/`recommendation` come
from whichever triggered rule scored the most points. Thresholds live as
named constants at the top of `risk_engine.py` if you want to tune them.

## Wiring it into the backend

The Spring Boot `ai/` module (see the main plan doc) calls `POST
/risk/analyze` whenever a batch is created or its transfer/blockchain state
changes, and caches the result on the batch record rather than calling on
every read.
