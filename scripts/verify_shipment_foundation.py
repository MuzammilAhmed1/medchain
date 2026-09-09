import requests
import time
import json
import sys

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

log("================================================================================")
log("MEDCHAIN PHASE 1: REAL SHIPMENT FOUNDATION END-TO-END VERIFICATION")
log("Raichur Manufacturer -> Bangalore Distributor Workflow")
log("================================================================================")

# 1. Register Manufacturer (Raichur)
mfg_org_name = f"Raichur Pharma Labs {ts}"
mfg_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Dr. Suresh Raichur",
    "email": f"suresh_{ts}@raichurpharma.in",
    "password": "Password123!",
    "organizationName": mfg_org_name,
    "role": "MANUFACTURER",
    "organizationType": "MANUFACTURER"
})
assert_true(mfg_res.status_code == 200, f"Register Raichur Manufacturer: {mfg_res.text}")
mfg_data = mfg_res.json()
mfg_token = mfg_data["token"]
mfg_headers = {"Authorization": f"Bearer {mfg_token}"}
log(f"Registered Manufacturer: {mfg_org_name}")

# Update Manufacturer Location to Raichur
loc_mfg_res = requests.put(f"{BASE_URL}/organizations/current/location", headers=mfg_headers, json={
    "address": "Plot 12, Industrial Area, Raichur",
    "city": "Raichur",
    "state": "Karnataka",
    "postalCode": "584102",
    "country": "India",
    "latitude": 16.2120,
    "longitude": 77.3439
})
assert_true(loc_mfg_res.status_code == 200, f"Update Raichur location: {loc_mfg_res.text}")
mfg_org = loc_mfg_res.json()
assert_true(mfg_org["city"] == "Raichur", "Manufacturer city is Raichur")
assert_true(mfg_org["latitude"] == 16.2120, "Manufacturer latitude is 16.2120")
log(f"Configured Raichur Location: {mfg_org.get('formattedAddress') or mfg_org.get('city')}")

# 2. Register Distributor (Bangalore)
dist_org_name = f"Bangalore MedLogistics {ts}"
dist_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Vikram Logistics",
    "email": f"vikram_{ts}@bangalorelogistics.in",
    "password": "Password123!",
    "organizationName": dist_org_name,
    "role": "DISTRIBUTOR",
    "organizationType": "DISTRIBUTOR"
})
assert_true(dist_res.status_code == 200, f"Register Bangalore Distributor: {dist_res.text}")
dist_data = dist_res.json()
dist_token = dist_data["token"]
dist_headers = {"Authorization": f"Bearer {dist_token}"}
log(f"Registered Distributor: {dist_org_name}")

# Update Distributor Location to Bangalore
loc_dist_res = requests.put(f"{BASE_URL}/organizations/current/location", headers=dist_headers, json={
    "address": "Electronic City Phase 1, Hosur Road, Bangalore",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560100",
    "country": "India",
    "latitude": 12.8452,
    "longitude": 77.6602
})
assert_true(loc_dist_res.status_code == 200, f"Update Bangalore location: {loc_dist_res.text}")
dist_org = loc_dist_res.json()
assert_true(dist_org["city"] == "Bangalore", "Distributor city is Bangalore")
assert_true(dist_org["latitude"] == 12.8452, "Distributor latitude is 12.8452")
log(f"Configured Bangalore Location: {dist_org.get('formattedAddress') or dist_org.get('city')}")

# 3. Register Pharmacy (Mysore)
pharm_org_name = f"Mysore Health Pharmacy {ts}"
pharm_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Pooja Pharmacist",
    "email": f"pooja_{ts}@mysorepharmacy.in",
    "password": "Password123!",
    "organizationName": pharm_org_name,
    "role": "PHARMACY",
    "organizationType": "PHARMACY"
})
assert_true(pharm_res.status_code == 200, f"Register Mysore Pharmacy: {pharm_res.text}")
pharm_token = pharm_res.json()["token"]
pharm_headers = {"Authorization": f"Bearer {pharm_token}"}
log(f"Registered Pharmacy: {pharm_org_name}")

# 4. Create Batch as Raichur Manufacturer
batch_res = requests.post(f"{BASE_URL}/batches", headers=mfg_headers, json={
    "medicineName": "Amoxicillin 500mg",
    "manufacturingDate": "2026-03-01",
    "expiryDate": "2028-03-01",
    "quantity": 10000
})
assert_true(batch_res.status_code == 200, f"Create Medicine Batch: {batch_res.text}")
batch = batch_res.json()
batch_id = batch["id"]
log(f"Created Medicine Batch: {batch_id} - {batch['medicineName']}")

# 5. Negative Test: Manufacturer CANNOT transfer directly to Pharmacy
neg_pharm_res = requests.post(f"{BASE_URL}/transfers", headers=mfg_headers, json={
    "batchId": batch_id,
    "toOrganizationName": pharm_org_name
})
assert_true(neg_pharm_res.status_code == 400, "Blocked invalid progression: Manufacturer -> Pharmacy (Rule enforced)")
log("Verified Role Progression: Manufacturer cannot bypass Distributor")

# 6. Manufacturer Initiates Shipment to Bangalore Distributor
init_res = requests.post(f"{BASE_URL}/transfers", headers=mfg_headers, json={
    "batchId": batch_id,
    "toOrganizationName": dist_org_name,
    "expectedDeliveryAt": "2026-09-12T18:00:00Z",
    "trackingEnabled": True,
    "trackingDeviceId": "DEV-TRUCK-KA36"
})
assert_true(init_res.status_code == 200, f"Initiate Shipment: {init_res.text}")
shipment = init_res.json()
shipment_id = shipment["id"]
shipment_num = shipment["shipmentNumber"]

assert_true(shipment_num.startswith("MC-SHIP-"), f"Shipment number format MC-SHIP-YYYY-XXXX: {shipment_num}")
assert_true(shipment["status"] == "INITIATED", "Shipment initial state is INITIATED")
assert_true(shipment["from"] == mfg_org_name, "Origin facility is Raichur Manufacturer")
assert_true(shipment["to"] == dist_org_name, "Destination facility is Bangalore Distributor")
assert_true("Raichur" in shipment["originAddress"], f"Origin address snapshotted: {shipment['originAddress']}")
assert_true("Bangalore" in shipment["destinationAddress"], f"Destination address snapshotted: {shipment['destinationAddress']}")
assert_true(shipment["originLatitude"] == 16.2120, "Origin latitude matches Raichur")
assert_true(shipment["destinationLatitude"] == 12.8452, "Destination latitude matches Bangalore")
log(f"Initiated Shipment: {shipment_num} from Raichur to Bangalore")

# 7. Negative Test: Destination CANNOT receive directly from INITIATED
neg_recv_res = requests.post(f"{BASE_URL}/transfers/{shipment_id}/receive", headers=dist_headers)
assert_true(neg_recv_res.status_code == 400, "Blocked early receive: Cannot receive directly from INITIATED")
log("Verified State Constraint: Shipment must be dispatched/in-transit before receipt")

# 8. Negative Test: Destination CANNOT start the shipment (Only origin can)
neg_start_res = requests.post(f"{BASE_URL}/transfers/{shipment_id}/start", headers=dist_headers)
assert_true(neg_start_res.status_code == 403, "Blocked unauthorized start: Distributor cannot start Manufacturer's shipment")
log("Verified Authorization: Only Origin can start/dispatch shipment")

# 9. Origin Starts Shipment (Dispatches from Raichur)
start_res = requests.post(f"{BASE_URL}/transfers/{shipment_id}/start", headers=mfg_headers)
assert_true(start_res.status_code == 200, f"Start Shipment: {start_res.text}")
started_shipment = start_res.json()
assert_true(started_shipment["status"] == "IN_TRANSIT", "Shipment status is now IN_TRANSIT")
assert_true(started_shipment["startedAt"] is not None, "startedAt timestamp is set")
log(f"Started Shipment: {shipment_num} is now IN_TRANSIT on the road from Raichur to Bangalore")

# 10. Negative Test: Cannot double-start
neg_double_start = requests.post(f"{BASE_URL}/transfers/{shipment_id}/start", headers=mfg_headers)
assert_true(neg_double_start.status_code == 400, "Blocked double-start: Cannot start an in-transit shipment")
log("Verified State Constraint: Cannot double-start shipment")

# 11. Negative Test: Origin CANNOT receive the shipment (Only destination can)
neg_mfg_recv = requests.post(f"{BASE_URL}/transfers/{shipment_id}/receive", headers=mfg_headers)
assert_true(neg_mfg_recv.status_code == 403, "Blocked unauthorized receive: Origin cannot confirm receipt for Destination")
log("Verified Authorization: Only intended recipient can confirm receipt")

# 12. Destination Confirms Receipt in Bangalore
recv_res = requests.post(f"{BASE_URL}/transfers/{shipment_id}/receive", headers=dist_headers)
assert_true(recv_res.status_code == 200, f"Receive Shipment: {recv_res.text}")
received_shipment = recv_res.json()
assert_true(received_shipment["status"] == "RECEIVED", "Shipment status is now RECEIVED")
assert_true(received_shipment["receivedAt"] is not None, "receivedAt timestamp is set")
log(f"Confirmed Receipt: {shipment_num} successfully delivered to Bangalore Distributor")

# 13. Negative Test: Cannot double-receive
neg_double_recv = requests.post(f"{BASE_URL}/transfers/{shipment_id}/receive", headers=dist_headers)
assert_true(neg_double_recv.status_code == 400, "Blocked double-receive: Cannot receive an already received shipment")
log("Verified State Constraint: Cannot double-receive shipment")

# 14. Verify Batch Custody Transferred to Bangalore Distributor
batch_detail_res = requests.get(f"{BASE_URL}/batches/{batch_id}", headers=dist_headers)
assert_true(batch_detail_res.status_code == 200, "Fetch updated batch details")
updated_batch = batch_detail_res.json()
assert_true(updated_batch["currentOwner"] == dist_org_name, f"Batch custody transferred to {dist_org_name}")
log("Verified Custody Transfer: Batch owner updated in database")

# 15. Verify Shipment Details and Chronological History Endpoints
detail_res = requests.get(f"{BASE_URL}/transfers/{shipment_id}", headers=mfg_headers)
assert_true(detail_res.status_code == 200, "Fetch shipment details by UUID")
assert_true(detail_res.json()["shipmentNumber"] == shipment_num, "Shipment details match shipment number")

# Lookup by Shipment Number
lookup_num_res = requests.get(f"{BASE_URL}/transfers/{shipment_num}", headers=mfg_headers)
assert_true(lookup_num_res.status_code == 200, "Fetch shipment details by Shipment Number")

# Query History / Timeline
history_res = requests.get(f"{BASE_URL}/transfers/{shipment_id}/history", headers=mfg_headers)
assert_true(history_res.status_code == 200, "Fetch shipment history")
events = history_res.json()
event_types = [e["eventType"] for e in events]
log(f"Chronological Audit Trail Events: {event_types}")
assert_true("TRANSFER_INITIATED" in event_types, "Audit trail contains TRANSFER_INITIATED")
assert_true("TRANSFER_IN_TRANSIT" in event_types, "Audit trail contains TRANSFER_IN_TRANSIT")
assert_true("TRANSFER_RECEIVED" in event_types, "Audit trail contains TRANSFER_RECEIVED")

# 16. Verify Filtering by Status on GET /api/transfers
all_shipments = requests.get(f"{BASE_URL}/transfers", headers=mfg_headers).json()
in_transit_shipments = requests.get(f"{BASE_URL}/transfers?status=IN_TRANSIT", headers=mfg_headers).json()
received_shipments = requests.get(f"{BASE_URL}/transfers?status=RECEIVED", headers=mfg_headers).json()
assert_true(any(s["shipmentNumber"] == shipment_num for s in received_shipments), "Shipment appears in status=RECEIVED filter")
assert_true(not any(s["shipmentNumber"] == shipment_num for s in in_transit_shipments), "Shipment does not appear in status=IN_TRANSIT filter")

log("================================================================================")
log("ALL TESTS PASSED! PHASE 1 REAL SHIPMENT FOUNDATION IS FULLY OPERATIONAL!")
log("================================================================================")
