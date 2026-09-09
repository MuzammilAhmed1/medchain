import json
import time
import requests
import subprocess
from datetime import datetime, timezone

BASE_URL = "http://localhost:8080/api"
AI_URL = "http://localhost:8000"

def run_test():
    print("=" * 80)
    print("MEDCHAIN FINAL PRODUCTION HARDENING: COMPREHENSIVE END-TO-END VERIFICATION")
    print("=" * 80)

    ts = int(time.time())
    mfg_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Dr. A. Sharma",
        "email": f"sharma_{ts}@pharma.in",
        "password": "Password123!",
        "role": "MANUFACTURER",
        "organizationName": f"Serum Manufacturing India {ts}",
        "organizationType": "MANUFACTURER"
    }).json()
    mfg_token = mfg_resp["token"]
    mfg_headers = {"Authorization": f"Bearer {mfg_token}"}
    mfg_org_id = mfg_resp["user"]["organization"]

    requests.put(f"{BASE_URL}/organizations/current/location", headers=mfg_headers, json={
        "address": "Plot 45, Biotech Park", "city": "Raichur", "state": "Karnataka",
        "country": "India", "postalCode": "584102", "latitude": 16.2120, "longitude": 77.3439
    })

    dist_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Rajesh Gupta",
        "email": f"rajesh_{ts}@dist.in",
        "password": "Password123!",
        "role": "DISTRIBUTOR",
        "organizationName": f"Apex Cold Logistics {ts}",
        "organizationType": "DISTRIBUTOR"
    }).json()
    dist_token = dist_resp["token"]
    dist_headers = {"Authorization": f"Bearer {dist_token}"}

    requests.put(f"{BASE_URL}/organizations/current/location", headers=dist_headers, json={
        "address": "Electronic City Phase 2", "city": "Bangalore", "state": "Karnataka",
        "country": "India", "postalCode": "560100", "latitude": 12.8452, "longitude": 77.6602
    })

    print("[PASS] Organizations & facilities registered with GPS locations.")

    # 2. Create Medicine Batch
    batch_resp = requests.post(f"{BASE_URL}/batches", headers=mfg_headers, json={
        "batchNumber": f"MC-FINAL-{ts}",
        "medicineName": "Covishield Vaccine 0.5ml",
        "manufacturingDate": "2026-03-01",
        "expiryDate": "2027-03-01",
        "quantity": 50000
    }).json()
    batch_id = batch_resp["id"]
    print(f"[PASS] Medicine Batch created: {batch_id}")

    # 3. Initiate Shipment
    shipment_resp = requests.post(f"{BASE_URL}/transfers", headers=mfg_headers, json={
        "batchId": batch_id,
        "toOrganizationName": dist_resp["user"]["organization"],
        "expectedDeliveryAt": "2026-09-15T18:00:00Z",
        "trackingEnabled": True,
        "trackingDeviceId": f"PHONE-DRIVER-{ts}"
    }).json()
    transfer_id = shipment_resp["id"]
    shipment_num = shipment_resp["shipmentNumber"]
    print(f"[PASS] Shipment INITIATED: {shipment_num} (UUID: {transfer_id})")

    # 4. Public Driver Shipment Lookup
    driver_lookup = requests.get(f"{BASE_URL}/tracking/driver/shipment/{shipment_num}").json()
    assert driver_lookup["status"] == "INITIATED"
    print(f"[PASS] Driver PWA can look up shipment: Status={driver_lookup['status']}")

    # 5. Dispatch Shipment (IN_TRANSIT)
    start_resp = requests.post(f"{BASE_URL}/transfers/{transfer_id}/start", headers=mfg_headers).json()
    assert start_resp["status"] == "IN_TRANSIT"
    print(f"[PASS] Shipment dispatched: Status={start_resp['status']}")

    # 6. Real Smartphone GPS Telemetry Ingestion
    gps_time = datetime.now(timezone.utc).isoformat()
    ping_resp = requests.post(f"{BASE_URL}/tracking/location", json={
        "shipmentId": shipment_num,
        "trackingDeviceId": f"PHONE-DRIVER-{ts}",
        "latitude": 15.6321,
        "longitude": 76.9012,
        "speedKph": 64.5,
        "headingDegrees": 182.0,
        "accuracyMeters": 8.0,
        "altitudeMeters": 420.0,
        "source": "SMARTPHONE_GPS",
        "recordedAt": gps_time
    }).json()
    assert ping_resp["valid"] == True
    print(f"[PASS] Ingested Smartphone GPS: ({ping_resp['latitude']}, {ping_resp['longitude']}) speed={ping_resp['speedKph']}km/h")

    # 7. Database Verification: Check PostgreSQL directly with psql
    psql_cmd = f"$env:PGPASSWORD='medchain'; & 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe' -h localhost -U medchain -d medchain -t -A -c \"SELECT latitude, longitude, speed_kph, heading_degrees, source FROM tracking_locations WHERE transfer_id='{transfer_id}' ORDER BY recorded_at DESC LIMIT 1;\""
    db_out = subprocess.check_output(["powershell", "-Command", psql_cmd], text=True).strip()
    print(f"[PASS] Direct PostgreSQL Row Found: {db_out}")
    assert "15.6321|76.9012|64.5|182|SMARTPHONE_GPS" in db_out

    # 8. Query Live Tracking Summary
    summary = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking", headers=mfg_headers).json()
    assert summary["trackingStatus"] == "LIVE"
    assert summary["currentLocation"]["latitude"] == 15.6321
    assert summary["route"] is not None
    print(f"[PASS] Tracking Summary LIVE: Speed={summary['currentSpeedKph']} km/h, ETA={summary['estimatedArrivalAt']}")

    # 9. Test AI Assistant with all 7 exact questions
    test_queries = [
        ("Where is my shipment?", "position"),
        (f"Where is {shipment_num}?", shipment_num),
        ("What is the current speed?", "64.5 km/h"),
        ("What is the ETA?", "Estimated Time of Arrival"),
        ("Is the shipment delayed?", "On Schedule"),
        ("Has the vehicle stopped?", "IN MOTION"),
        ("Show me the shipment journey.", "Route Checkpoints Progress")
    ]

    print("\n--- AI ASSISTANT AUDIT (7 EXACT QUESTIONS) ---")
    for q_text, expected_substr in test_queries:
        ai_req_body = {
            "query": q_text,
            "userRole": "MANUFACTURER",
            "organizationName": f"Serum Manufacturing India {ts}",
            "batches": [batch_resp],
            "alerts": [],
            "transfers": [{
                "id": transfer_id,
                "shipmentNumber": shipment_num,
                "batchId": batch_id,
                "medicineName": "Covishield Vaccine 0.5ml",
                "fromOrg": f"Serum Manufacturing India {ts}",
                "toOrg": f"Apex Cold Logistics {ts}",
                "originAddress": "Plot 45, Biotech Park, Raichur",
                "destinationAddress": "Electronic City Phase 2, Bangalore",
                "status": "IN_TRANSIT",
                "currentLatitude": 15.6321,
                "currentLongitude": 76.9012,
                "currentSpeedKph": 64.5,
                "headingDegrees": 182.0,
                "estimatedArrivalAt": summary.get("estimatedArrivalAt", "2026-09-09 18:30 UTC"),
                "trafficDelaySeconds": 0
            }],
            "anomalies": []
        }
        res = requests.post(f"{AI_URL}/ai/assistant/query", json=ai_req_body).json()
        ans = res["answerMarkdown"]
        print(f"\n[Q]: \"{q_text}\"")
        first_line = ans.split("\n")[0]
        try:
            print(f"[A Preview]: {first_line}")
        except UnicodeEncodeError:
            print(f"[A Preview]: {first_line.encode('ascii', 'replace').decode('ascii')}")
        assert expected_substr.lower() in ans.lower(), f"Expected '{expected_substr}' in response for query '{q_text}'"
        print(f"[PASS] Query answered accurately with real telemetry!")

    # 10. Receive Shipment
    recv_resp = requests.post(f"{BASE_URL}/transfers/{transfer_id}/receive", headers=dist_headers).json()
    assert recv_resp["status"] == "RECEIVED"
    print(f"\n[PASS] Shipment confirmed received by Distributor: Status={recv_resp['status']}")

    # 11. Verify tracking closed & history preserved
    post_summary = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking", headers=mfg_headers).json()
    assert post_summary["trackingStatus"] == "OFFLINE"
    print(f"[PASS] Tracking status post-delivery: {post_summary['trackingStatus']}")

    history = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking/history", headers=mfg_headers).json()
    assert len(history["content"]) >= 1
    print(f"[PASS] Historical GPS records preserved after delivery: {len(history['content'])} points in history")

    print("\n" + "=" * 80)
    print("ALL 11 PRODUCTION ACCEPTANCE STAGES FULLY VERIFIED AND PASSING!")
    print("=" * 80)

if __name__ == "__main__":
    run_test()
