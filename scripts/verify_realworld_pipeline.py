#!/usr/bin/env python3
import time
import requests
import sys

BASE_URL = "http://localhost:8080/api"
AI_URL = "http://localhost:8000"
ts = int(time.time())

def log(msg, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "PASS": "\033[92m",
        "FAIL": "\033[91m",
        "WARN": "\033[93m",
        "RESET": "\033[0m"
    }
    prefix = f"[{status}]"
    try:
        print(f"{colors.get(status, '')}{prefix} {msg}{colors.get('RESET', '')}")
    except UnicodeEncodeError:
        safe_msg = str(msg).encode('ascii', 'replace').decode('ascii')
        print(f"{prefix} {safe_msg}")

def assert_true(condition, msg):
    if condition:
        log(f"PASS: {msg}", "PASS")
    else:
        log(f"FAIL: {msg}", "FAIL")
        sys.exit(1)

log("=" * 80)
log("MEDCHAIN REAL-WORLD TRANSITION: SMARTPHONE GPS PIPELINE VERIFICATION")
log("=" * 80)

# 1. Register Manufacturer and Distributor
mfg_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Dr. Suresh Raichur",
    "email": f"suresh_driver_{ts}@raichurpharma.in",
    "password": "Password123!",
    "organizationName": f"Raichur Pharma Labs RW_{ts}",
    "role": "MANUFACTURER",
    "organizationType": "MANUFACTURER"
})
assert_true(mfg_res.status_code == 200, "Register Manufacturer")
mfg_token = mfg_res.json()["token"]
mfg_headers = {"Authorization": f"Bearer {mfg_token}"}

requests.put(f"{BASE_URL}/organizations/current/location", headers=mfg_headers, json={
    "address": "Plot 12, Industrial Area, Raichur",
    "city": "Raichur",
    "state": "Karnataka",
    "postalCode": "584102",
    "country": "India",
    "latitude": 16.2120,
    "longitude": 77.3439
})

dist_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Vikram Logistics",
    "email": f"vikram_driver_{ts}@medlogistics.in",
    "password": "Password123!",
    "organizationName": f"Bangalore MedLogistics RW_{ts}",
    "role": "DISTRIBUTOR",
    "organizationType": "DISTRIBUTOR"
})
assert_true(dist_res.status_code == 200, "Register Distributor")
dist_token = dist_res.json()["token"]
dist_headers = {"Authorization": f"Bearer {dist_token}"}
dist_org = dist_res.json()["user"]["organization"]

requests.put(f"{BASE_URL}/organizations/current/location", headers=dist_headers, json={
    "address": "Electronic City Phase 1, Hosur Road, Bangalore",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560100",
    "country": "India",
    "latitude": 12.8452,
    "longitude": 77.6602
})

# 2. Create Medicine Batch
batch_res = requests.post(f"{BASE_URL}/batches", headers=mfg_headers, json={
    "medicineName": "Paracetamol 650mg Live",
    "quantity": 5000,
    "manufacturingDate": "2026-03-01",
    "expiryDate": "2028-03-01"
})
assert_true(batch_res.status_code == 200, "Create Medicine Batch")
batch_id = batch_res.json()["id"]

# 3. Initiate Shipment with Tracking Enabled
ship_res = requests.post(f"{BASE_URL}/transfers", headers=mfg_headers, json={
    "batchId": batch_id,
    "toOrganizationName": dist_org,
    "expectedDeliveryAt": "2026-09-15T18:00:00Z",
    "trackingEnabled": True,
    "trackingDeviceId": f"PHONE-DRIVER-{ts}"
})
assert_true(ship_res.status_code == 200, "Initiate Shipment")
shipment = ship_res.json()
shipment_id = shipment["id"]
shipment_number = shipment["shipmentNumber"]
device_id = shipment["trackingDeviceId"]
log(f"Initiated Shipment: {shipment_number} with device {device_id}")

# 4. Verify Driver PWA Lookup endpoint (Public, No Auth required)
driver_info_res = requests.get(f"{BASE_URL}/tracking/driver/shipment/{shipment_number}")
assert_true(driver_info_res.status_code == 200, "Driver PWA public shipment lookup")
driver_data = driver_info_res.json()
assert_true(driver_data["status"] == "INITIATED", "Driver receives INITIATED status before dispatch")

# 5. Start Shipment (Dispatched to IN_TRANSIT)
start_res = requests.post(f"{BASE_URL}/transfers/{shipment_id}/start", headers=mfg_headers)
assert_true(start_res.status_code == 200, "Start Shipment")
assert_true(start_res.json()["status"] == "IN_TRANSIT", "Shipment is now IN_TRANSIT")

driver_info_res = requests.get(f"{BASE_URL}/tracking/driver/shipment/{shipment_number}")
assert_true(driver_info_res.json()["status"] == "IN_TRANSIT", "Driver sees IN_TRANSIT, ready for GPS lock")

# 6. Transmit Smartphone GPS Location Pings from Driver PWA
gps_points = [
    {"lat": 16.2120, "lng": 77.3439, "speed": 0.0, "heading": 180.0, "acc": 5.0},
    {"lat": 15.6321, "lng": 76.9012, "speed": 62.5, "heading": 185.0, "acc": 8.0},
    {"lat": 15.1394, "lng": 76.9214, "speed": 68.0, "heading": 190.0, "acc": 10.0},
]

for idx, pt in enumerate(gps_points):
    ping_res = requests.post(f"{BASE_URL}/tracking/location", json={
        "shipmentId": shipment_number,
        "trackingDeviceId": device_id,
        "latitude": pt["lat"],
        "longitude": pt["lng"],
        "speedKph": pt["speed"],
        "headingDegrees": pt["heading"],
        "accuracyMeters": pt["acc"],
        "source": "SMARTPHONE_GPS"
    })
    assert_true(ping_res.status_code == 200, f"Smartphone GPS Ping {idx+1} ingested: ({pt['lat']}, {pt['lng']})")

# 7. Query Tracking Summary
summary_res = requests.get(f"{BASE_URL}/transfers/{shipment_id}/tracking", headers=dist_headers)
assert_true(summary_res.status_code == 200, "Get Tracking Summary")
summary = summary_res.json()
assert_true(summary["trackingStatus"] == "LIVE", f"Tracking Status is LIVE (got {summary['trackingStatus']})")
assert_true(summary["currentLocation"]["latitude"] == 15.1394, "Current GPS location updated to latest phone coordinate")
assert_true(summary["currentLocation"]["source"] == "SMARTPHONE_GPS", "Telemetry source is SMARTPHONE_GPS")
assert_true(summary["route"] is not None, "Calculated route exists")
assert_true(summary["estimatedArrivalAt"] is not None, "Dynamic ETA computed")
log(f"Verified Live Tracking Summary: Speed={summary['currentSpeedKph']} km/h, Heading={summary['headingDegrees']}°, Status={summary['trackingStatus']}")

# 8. Query AI Assistant for Live Shipment Intelligence
ai_query_res = requests.post(f"{BASE_URL}/v1/assistant/query", headers=dist_headers, json={
    "query": f"Where is shipment {shipment_number}?"
})
assert_true(ai_query_res.status_code == 200, "Query AI Assistant for shipment")
ai_answer = ai_query_res.json()["answerMarkdown"]
assert_true(shipment_number in ai_answer, f"AI response references {shipment_number}")
assert_true("Real-Time GPS Telemetry" in ai_answer or "Live Shipment Intelligence" in ai_answer, "AI Assistant outputted live journey intelligence")
log(f"AI Assistant Output Sample:\n{ai_answer[:220]}...")

# 9. Receive Shipment at Destination (Distributor)
recv_res = requests.post(f"{BASE_URL}/transfers/{shipment_id}/receive", headers=dist_headers)
assert_true(recv_res.status_code == 200, "Confirm Shipment Receipt")
assert_true(recv_res.json()["status"] == "RECEIVED", "Status updated to RECEIVED")

# 10. Verify Tracking Closes After Receipt
post_recv_summary = requests.get(f"{BASE_URL}/transfers/{shipment_id}/tracking", headers=dist_headers).json()
assert_true(post_recv_summary["trackingStatus"] == "OFFLINE", "Tracking status set to OFFLINE after delivery")

log("=" * 80)
log("REAL-WORLD SMARTPHONE GPS TO FRONTEND PIPELINE VERIFIED SUCCESSFULLY! 100% PASS")
log("=" * 80)
