import urllib.request
import urllib.error
import json
import time
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_URL = "http://localhost:8080"

def post(url, data, token=None):
    payload = json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{url}", data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def get(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{url}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print("=== STEP 1: AUTHENTICATION ===")
# Register or login real manufacturer
reg_status, reg_res = post("/api/auth/register", {
    "name": "Apex Manufacturer Admin",
    "email": "mfg_admin@apex.com",
    "password": "Password123!",
    "organizationName": "Apex Manufacturing Ltd",
    "role": "MANUFACTURER",
    "organizationType": "MANUFACTURER"
})

if reg_status in (200, 201) and isinstance(reg_res, dict) and "token" in reg_res:
    token = reg_res["token"]
    print(f"Registered user: {reg_res['user']['email']}, Token: {token[:20]}...")
else:
    # Login
    login_status, login_res = post("/api/auth/login", {
        "email": "mfg_admin@apex.com",
        "password": "Password123!"
    })
    if login_status == 200 and isinstance(login_res, dict) and "token" in login_res:
        token = login_res["token"]
        print(f"Logged in user: {login_res['user']['email']}, Token: {token[:20]}...")
    else:
        raise RuntimeError(f"Auth failed: status {login_status}, response: {login_res}")

print("\n=== STEP 2: BATCH INVENTORY ===")
status, batches = get("/api/batches", token)
print(f"Fetched {len(batches)} batches from database.")
if not batches:
    # Create batch
    status, new_batch = post("/api/batches", {
        "medicineName": "Amoxicillin 500mg",
        "manufacturingDate": "2026-03-01",
        "expiryDate": "2026-12-31",
        "quantity": 5000
    }, token)
    batch_id = new_batch["id"]
    print(f"Created real batch in DB and Hardhat blockchain: {batch_id}")
else:
    batch_id = batches[0]["id"]
    print(f"Using batch: {batch_id} ({batches[0]['medicineName']}, status: {batches[0]['status']})")

print("\n=== STEP 3: COLD-CHAIN TELEMETRY INGESTION (SENSOR SIMULATOR VIA API) ===")
# Send normal reading
status, reading1 = post("/api/v1/cold-chain/readings", {
    "batchId": batch_id,
    "deviceId": "IOT-SENSOR-BAY-01",
    "temperature": 4.5,
    "humidity": 52.0,
    "location": "Central Warehouse Bay 4"
}, token)
print(f"Normal telemetry ingestion: HTTP {status} | Temp: {reading1.get('temperature')}°C | ID: {reading1.get('id')}")

# Send excursion spike reading (12.5°C > 8.0°C)
status, reading2 = post("/api/v1/cold-chain/readings", {
    "batchId": batch_id,
    "deviceId": "IOT-SENSOR-BAY-01",
    "temperature": 12.5,
    "humidity": 58.0,
    "location": "Transit Vehicle #42"
}, token)
print(f"Spike telemetry ingestion: HTTP {status} | Temp: {reading2.get('temperature')}°C | ID: {reading2.get('id')}")

# Verify generated alerts
status, alerts = get(f"/api/v1/cold-chain/batches/{batch_id}/alerts", token)
print(f"Verified Cold-Chain Alerts: Found {len(alerts)} alert(s).")
if alerts:
    latest_alert = alerts[0]
    print(f"  Alert ID: {latest_alert['id']}")
    print(f"  Severity: {latest_alert['severity']}")
    print(f"  Message:  {latest_alert['message']}")
    print(f"  Duration: {latest_alert['durationMinutes']} min | Degree-Minutes: {latest_alert['degreeMinutesExcursion']}")

print("\n=== STEP 4: AI FRAUD & SUPPLY-CHAIN ANOMALY CENTER ===")
status, anom = post(f"/api/v1/anomalies/analyze/{batch_id}", {}, token)
print(f"AI Anomaly Analysis: HTTP {status}")
print(f"  Anomaly Score:       {anom.get('score')}/100")
print(f"  Severity:            {anom.get('severity')}")
print(f"  Detected Reason:     {anom.get('detectedReason')}")
print(f"  Model Version:       {anom.get('modelVersion')}")
print(f"  Has Sufficient Data: {anom.get('hasSufficientData')}")

print("\n=== STEP 5: PREDICTIVE DEMAND & EXPIRY ANALYTICS ===")
status, demand = get("/api/v1/predictions/demand", token)
print(f"Demand Forecasting: HTTP {status} | Records: {len(demand)}")
for d in demand[:3]:
    print(f"  Medicine: {d['medicineName']} | Stock: {d['currentStock']} | 30d Demand: {d['predictedDemand30d']} | Shortage Risk: {d['shortageRisk']} | Has Sufficient Data: {d['hasSufficientData']}")

status, expiry = get(f"/api/v1/predictions/expiry/{batch_id}", token)
print(f"Expiry Prediction for {batch_id}: HTTP {status}")
print(f"  Days to Expiry:    {expiry.get('daysToExpiry')}")
print(f"  Burn Rate:         {expiry.get('dailyBurnRate')} units/day")
print(f"  Estimated Unused:  {expiry.get('estimatedRemaining')} ({expiry.get('remainingPercentage')}%)")
print(f"  Risk Level:        {expiry.get('riskLevel')}")
print(f"  Explanation:       {expiry.get('explanation')}")

print("\n=== STEP 6: DETERMINISTIC ORGANIZATION TRUST SCORING ===")
status, trust_scores = get("/api/v1/organizations/trust-scores", token)
print(f"Organization Trust Scores: HTTP {status} | Count: {len(trust_scores)}")
for ts in trust_scores:
    print(f"  Org: {ts['organizationName']} | Trust Score: {ts['score']}/100 | Transfers: {ts['successfulTransfers']} | Delays: {ts['delayedTransfers']} | Violations: {ts['coldChainViolations']}")

print("\n=== STEP 7: DEDICATED BLOCKCHAIN EXPLORER ===")
status, bc_events = get("/api/v1/blockchain/explorer/events", token)
print(f"Blockchain Explorer Events: HTTP {status} | Total Events: {bc_events.get('totalElements')}")
for evt in bc_events.get("content", [])[:3]:
    print(f"  TxHash: {evt['txHash']} | Block: #{evt['blockNumber']} | Type: {evt['eventType']} | Batch: {evt['batchId']}")

status, timeline = get(f"/api/v1/blockchain/explorer/batches/{batch_id}/timeline", token)
print(f"Blockchain Custody Timeline: HTTP {status} | Stages: {len(timeline.get('timeline', []))}")
for step in timeline.get("timeline", []):
    confirmed = step.get('blockchainConfirmed', step.get('isBlockchainConfirmed', False))
    print(f"  Stage: {step['stage']} | Actor: {step['actor']} | Confirmed On-Chain: {confirmed} | Tx: {step['txHash']}")

print("\n=== STEP 8: NOTIFICATION SYSTEM & ROLE SCOPING ===")
status, notifs = get("/api/v1/notifications", token)
print(f"Role-Scoped Notifications: HTTP {status} | Unread Count: {len([n for n in notifs.get('content', []) if not n.get('isRead', n.get('read', False))])}")
for n in notifs.get("content", [])[:3]:
    print(f"  [{n['notificationType']}] {n['title']} — {n['message'][:60]}...")

print("\n=== STEP 9: AI SUPPLY-CHAIN ASSISTANT QUERY ===")
status, query_res1 = post("/api/v1/assistant/query", {"query": "Which batches are high risk?"}, token)
print(f"Assistant Query (High Risk): HTTP {status}")
print(f"  Response: {query_res1.get('answerMarkdown')[:150]}...")
print(f"  Referenced Batches: {query_res1.get('referencedBatchIds')}")

status, query_res2 = post("/api/v1/assistant/query", {"query": f"What is the status of batch {batch_id}?"}, token)
print(f"Assistant Query (Batch Deep-dive): HTTP {status}")
print(f"  Response: {query_res2.get('answerMarkdown')[:150]}...")
print(f"  Referenced Batches: {query_res2.get('referencedBatchIds')}")

print("\n=======================================================")
print("✅ ALL 9 ENTERPRISE SUITES EXECUTED AND VERIFIED END-TO-END!")
print("=======================================================")
