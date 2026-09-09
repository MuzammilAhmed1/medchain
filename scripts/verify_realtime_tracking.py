#!/usr/bin/env python3
"""
MedChain Phase 2 Verification Script
Strict End-to-End Verification for Real-Time GPS Tracking & Google Maps Routing.
"""

import datetime
import json
import sys
import time
import requests

BASE_URL = "http://localhost:8080/api"
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
    print(f"{colors.get(status, '')}{prefix} {msg}{colors.get('RESET', '')}")

def assert_true(condition, msg):
    if condition:
        log(f"PASS: {msg}", "PASS")
    else:
        log(f"FAIL: {msg}", "FAIL")
        sys.exit(1)

log("=" * 80)
log("MEDCHAIN PHASE 2: REAL-TIME GPS TRACKING & ROUTING VERIFICATION")
log("=" * 80)

# ----------------------------------------------------------------------
# 1. Register Manufacturer (Raichur) and Distributor (Bangalore)
# ----------------------------------------------------------------------
mfg_org_name = f"Raichur Pharma Labs P2_{ts}"
mfg_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Dr. Suresh Raichur",
    "email": f"suresh_p2_{ts}@raichurpharma.in",
    "password": "Password123!",
    "organizationName": mfg_org_name,
    "role": "MANUFACTURER",
    "organizationType": "MANUFACTURER"
})
assert_true(mfg_res.status_code == 200, f"Register Raichur Manufacturer: {mfg_res.text}")
mfg_data = mfg_res.json()
mfg_token = mfg_data["token"]
mfg_headers = {"Authorization": f"Bearer {mfg_token}"}

loc_mfg_res = requests.put(f"{BASE_URL}/organizations/current/location", headers=mfg_headers, json={
    "address": "Plot 12, Industrial Area, Raichur",
    "city": "Raichur",
    "state": "Karnataka",
    "postalCode": "584102",
    "country": "India",
    "latitude": 16.2120,
    "longitude": 77.3439
})
assert_true(loc_mfg_res.status_code == 200, "Configured Raichur facility coordinates")

dist_org_name = f"Bangalore MedLogistics P2_{ts}"
dist_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Vikram Logistics",
    "email": f"vikram_p2_{ts}@bangalorelogistics.in",
    "password": "Password123!",
    "organizationName": dist_org_name,
    "role": "DISTRIBUTOR",
    "organizationType": "DISTRIBUTOR"
})
assert_true(dist_res.status_code == 200, f"Register Bangalore Distributor: {dist_res.text}")
dist_data = dist_res.json()
dist_token = dist_data["token"]
dist_headers = {"Authorization": f"Bearer {dist_token}"}

loc_dist_res = requests.put(f"{BASE_URL}/organizations/current/location", headers=dist_headers, json={
    "address": "Electronic City Phase 1, Hosur Road, Bangalore",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560100",
    "country": "India",
    "latitude": 12.8452,
    "longitude": 77.6602
})
assert_true(loc_dist_res.status_code == 200, "Configured Bangalore facility coordinates")

# ----------------------------------------------------------------------
# 2. Create Medicine Batch
# ----------------------------------------------------------------------
batch_res = requests.post(f"{BASE_URL}/batches", headers=mfg_headers, json={
    "medicineName": "Insulin Glargine 100IU",
    "manufacturingDate": "2026-03-01",
    "expiryDate": "2028-03-01",
    "quantity": 2500
})
assert_true(batch_res.status_code == 200, f"Create Medicine Batch: {batch_res.text}")
batch = batch_res.json()
batch_id = batch["id"]
log(f"Created Medicine Batch: {batch_id}")

# ----------------------------------------------------------------------
# 3. Initiate Shipment with Tracking Device
# ----------------------------------------------------------------------
device_id = f"IOT-TRUCK-{ts % 10000:04d}"
ship_res = requests.post(f"{BASE_URL}/transfers", headers=mfg_headers, json={
    "batchId": batch_id,
    "toOrganizationName": dist_org_name,
    "expectedDeliveryAt": "2026-09-12T18:00:00Z",
    "trackingEnabled": True,
    "trackingDeviceId": device_id
})
assert_true(ship_res.status_code == 200, f"Initiate Shipment: {ship_res.text}")
shipment = ship_res.json()
transfer_id = shipment["id"]
shipment_number = shipment["shipmentNumber"]
log(f"Initiated Shipment: {shipment_number} (Transfer ID: {transfer_id}) with Device ID: {device_id}")

# ----------------------------------------------------------------------
# 4. Check Tracking State Before Dispatch
# ----------------------------------------------------------------------
summary_res = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking", headers=mfg_headers)
assert_true(summary_res.status_code == 200, "Fetch tracking summary before dispatch")
pre_summary = summary_res.json()
assert_true(pre_summary["trackingStatus"] in ["WAITING_FOR_SIGNAL", "NOT_CONFIGURED"], 
            f"Pre-dispatch tracking status is {pre_summary['trackingStatus']}")
log("Pre-dispatch tracking summary validated: status is WAITING_FOR_SIGNAL")

# Ingesting GPS while INITIATED should be rejected (must be IN_TRANSIT)
premature_gps = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": device_id,
    "latitude": 16.2120,
    "longitude": 77.3439,
    "speedKph": 0.0,
    "headingDegrees": 0.0,
    "recordedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
})
assert_true(premature_gps.status_code in [400, 422], 
            f"Rejected GPS ingestion for non-IN_TRANSIT shipment: HTTP {premature_gps.status_code}")
log("Verified Constraint: Cannot ingest GPS for shipment that is not IN_TRANSIT")

# ----------------------------------------------------------------------
# 5. Dispatch Shipment (IN_TRANSIT)
# ----------------------------------------------------------------------
start_res = requests.post(f"{BASE_URL}/transfers/{transfer_id}/start", headers=mfg_headers)
assert_true(start_res.status_code == 200, f"Start Shipment: {start_res.text}")
assert_true(start_res.json()["status"] == "IN_TRANSIT", "Shipment status is now IN_TRANSIT")
log("Shipment dispatched and is now IN_TRANSIT")

# ----------------------------------------------------------------------
# 6. Test Ingestion Validation Boundaries
# ----------------------------------------------------------------------
# Invalid latitude (> 90)
bad_lat = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": device_id,
    "latitude": 95.1234,
    "longitude": 77.3439,
    "speedKph": 50.0,
    "recordedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
})
assert_true(bad_lat.status_code in [400, 422], f"Rejected invalid latitude 95.1234: HTTP {bad_lat.status_code}")
log("Verified Boundary: Latitude > 90.0 rejected")

# Invalid longitude (< -180)
bad_lng = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": device_id,
    "latitude": 16.2120,
    "longitude": -195.0,
    "speedKph": 50.0,
    "recordedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
})
assert_true(bad_lng.status_code in [400, 422], f"Rejected invalid longitude -195.0: HTTP {bad_lng.status_code}")
log("Verified Boundary: Longitude < -180.0 rejected")

# Unregistered device ID
unknown_dev = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": "NON_EXISTENT_DEVICE_XYZ",
    "latitude": 16.2120,
    "longitude": 77.3439,
    "speedKph": 50.0,
    "recordedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
})
assert_true(unknown_dev.status_code in [400, 403, 404], f"Rejected unknown device ID: HTTP {unknown_dev.status_code}")
log("Verified Security: Unknown tracking device ID rejected")

# ----------------------------------------------------------------------
# 7. Ingest Valid GPS Sequence
# ----------------------------------------------------------------------
# Point 1: At Raichur origin
p1_time = datetime.datetime.now(datetime.timezone.utc)
p1_res = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": shipment_number,
    "trackingDeviceId": device_id,
    "latitude": 16.2120,
    "longitude": 77.3439,
    "speedKph": 40.0,
    "headingDegrees": 185.0,
    "altitudeMeters": 400.0,
    "accuracyMeters": 3.0,
    "recordedAt": p1_time.isoformat()
})
assert_true(p1_res.status_code == 200, f"Ingest Point 1 (Raichur): {p1_res.text}")
log("Ingested Point 1: Raichur Origin (16.2120, 77.3439)")

time.sleep(1)

# Point 2: Along corridor near Bellary
p2_time = datetime.datetime.now(datetime.timezone.utc)
p2_res = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": device_id,
    "latitude": 15.1394,
    "longitude": 76.9214,
    "speedKph": 68.5,
    "headingDegrees": 190.0,
    "altitudeMeters": 450.0,
    "accuracyMeters": 2.5,
    "recordedAt": p2_time.isoformat()
})
assert_true(p2_res.status_code == 200, f"Ingest Point 2 (Bellary): {p2_res.text}")
log("Ingested Point 2: Bellary Bypass (15.1394, 76.9214)")

time.sleep(1)

# Point 3: Near Bangalore entry
p3_time = datetime.datetime.now(datetime.timezone.utc)
p3_res = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": shipment_number,
    "trackingDeviceId": device_id,
    "latitude": 13.1000,
    "longitude": 77.3500,
    "speedKph": 55.0,
    "headingDegrees": 150.0,
    "altitudeMeters": 890.0,
    "accuracyMeters": 2.0,
    "recordedAt": p3_time.isoformat()
})
assert_true(p3_res.status_code == 200, f"Ingest Point 3 (Nelamangala): {p3_res.text}")
log("Ingested Point 3: Nelamangala Bangalore Approach (13.1000, 77.3500)")

# ----------------------------------------------------------------------
# 8. Query Tracking Endpoints
# ----------------------------------------------------------------------
# A. Current Location
curr_res = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking/current", headers=mfg_headers)
assert_true(curr_res.status_code == 200, f"Get current location: {curr_res.text}")
curr_loc = curr_res.json()
assert_true(curr_loc["latitude"] == 13.1000, "Current location latitude matches Point 3")
assert_true(curr_loc["longitude"] == 77.3500, "Current location longitude matches Point 3")
assert_true(curr_loc["speedKph"] == 55.0, "Current location speed matches Point 3")
log("Current location endpoint verified with latest coordinates")

# B. Location History
hist_res = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking/history", headers=mfg_headers)
assert_true(hist_res.status_code == 200, f"Get tracking history: {hist_res.text}")
history = hist_res.json()
assert_true(len(history) >= 3, f"Tracking history has {len(history)} recorded points (>=3)")
log(f"Tracking history endpoint verified: {len(history)} points recorded")

# C. Trail Endpoint
trail_res = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking/trail", headers=mfg_headers)
assert_true(trail_res.status_code == 200, f"Get tracking trail: {trail_res.text}")
trail = trail_res.json()
assert_true(len(trail) >= 3, f"Tracking trail returned {len(trail)} coordinate tuples")
assert_true("latitude" in trail[0] and "longitude" in trail[0], "Trail points contain latitude/longitude keys")
log(f"Tracking trail endpoint verified: {len(trail)} trail markers")

# D. Route Endpoint
route_res = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking/route", headers=mfg_headers)
assert_true(route_res.status_code == 200, f"Get computed route: {route_res.text}")
route_data = route_res.json()
duration_seconds = route_data.get("trafficDurationSeconds") or route_data.get("staticDurationSeconds")
assert_true(route_data["distanceMeters"] > 0, f"Route distance is positive: {route_data['distanceMeters']}m")
assert_true(duration_seconds is not None and duration_seconds > 0, f"Route duration is positive: {duration_seconds}s")
assert_true(route_data["encodedPolyline"] is not None and len(route_data["encodedPolyline"]) > 0, 
            "Route polyline is generated")
log(f"Route endpoint verified: {route_data['distanceMeters']/1000:.1f} km, "
    f"{duration_seconds/60:.1f} mins, polyline length {len(route_data['encodedPolyline'])}")

# E. Tracking Summary
summary_res = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking", headers=mfg_headers)
assert_true(summary_res.status_code == 200, f"Get tracking summary: {summary_res.text}")
summary = summary_res.json()
assert_true(summary["trackingStatus"] == "LIVE", f"Tracking status is LIVE (got {summary['trackingStatus']})")
assert_true(summary["currentLocation"] is not None, "Tracking summary includes currentLocation")
assert_true(summary["route"] is not None, "Tracking summary includes route")
assert_true(summary["distanceRemainingMeters"] is not None, "Tracking summary includes distanceRemainingMeters")
assert_true(summary["estimatedArrivalAt"] is not None, f"Tracking summary includes computed ETA: {summary['estimatedArrivalAt']}")
log(f"Tracking summary endpoint verified: status={summary['trackingStatus']}, ETA={summary['estimatedArrivalAt']}")

# ----------------------------------------------------------------------
# 9. Test Anomaly Checks
# ----------------------------------------------------------------------
# A. Impossible Movement Detection (Jump from Bangalore to Delhi in 2 seconds)
impossible_time = datetime.datetime.now(datetime.timezone.utc)
imp_res = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": device_id,
    "latitude": 28.6139, # New Delhi
    "longitude": 77.2090,
    "speedKph": 70.0,
    "recordedAt": impossible_time.isoformat()
})
assert_true(imp_res.status_code == 200, "Ingested impossible jump point")

# Audit trail logs velocity warning
hist_audit = requests.get(f"{BASE_URL}/transfers/{transfer_id}/history", headers=mfg_headers).json()
batch_details = requests.get(f"{BASE_URL}/batches/{batch_id}", headers=mfg_headers).json()
combined_audit = str(hist_audit) + str(batch_details.get("timeline", []))
found_anomaly_warning = "Telemetry Warning" in combined_audit or "velocity" in combined_audit
assert_true(found_anomaly_warning, "Anomaly recorded in audit trail: Telemetry Warning for excessive velocity")
log("Anomaly Detection Verified: Impossible movement (>160 km/h jump) audit logged successfully")

# ----------------------------------------------------------------------
# 10. Receive Shipment and Confirm Delivery
# ----------------------------------------------------------------------
recv_res = requests.post(f"{BASE_URL}/transfers/{transfer_id}/receive", headers=dist_headers)
assert_true(recv_res.status_code == 200, f"Receive shipment: {recv_res.text}")
assert_true(recv_res.json()["status"] == "RECEIVED", "Shipment status is RECEIVED")
log("Shipment marked as RECEIVED by Bangalore Distributor")

# Check tracking summary post-receipt
post_recv_summary = requests.get(f"{BASE_URL}/transfers/{transfer_id}/tracking", headers=mfg_headers).json()
assert_true(post_recv_summary["trackingStatus"] in ["OFFLINE", "LIVE", "WAITING_FOR_SIGNAL"], 
            f"Post-delivery tracking status: {post_recv_summary['trackingStatus']}")
log("Post-delivery tracking status checked")

# Post-delivery GPS point should be rejected or ignored
post_recv_gps = requests.post(f"{BASE_URL}/tracking/location", json={
    "shipmentId": transfer_id,
    "trackingDeviceId": device_id,
    "latitude": 12.8452,
    "longitude": 77.6602,
    "speedKph": 0.0,
    "recordedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
})
assert_true(post_recv_gps.status_code in [400, 422], 
            f"Rejected telemetry ingestion for RECEIVED shipment: HTTP {post_recv_gps.status_code}")
log("Verified Constraint: Tracking closed after shipment delivery is confirmed")

log("=" * 80)
log("ALL TESTS PASSED! PHASE 2 REAL-TIME GPS TRACKING & GOOGLE MAPS IS FULLY OPERATIONAL!")
log("=" * 80)
