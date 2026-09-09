#!/usr/bin/env python3
"""
DEV SENSOR SIMULATOR (IoT Cold-Chain Telemetry Simulator)
========================================================
This tool is strictly for simulating external IoT temperature and humidity sensors.
It interacts exclusively through the public/authenticated REST API:
    POST /api/v1/cold-chain/readings

It DOES NOT access PostgreSQL or internal backend databases directly.
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
import urllib.request
import urllib.error

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def login_for_token(base_url, email, password):
    url = f"{base_url}/api/auth/login"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            token = res_data.get("token")
            print(f"[AUTH] Successfully authenticated as '{email}'. Token acquired.")
            return token
    except Exception as e:
        print(f"[AUTH ERROR] Failed to authenticate: {e}")
        return None


def send_reading(base_url, token, batch_id, device_id, temperature, humidity, location):
    url = f"{base_url}/api/v1/cold-chain/readings"
    payload = json.dumps({
        "batchId": batch_id,
        "deviceId": device_id,
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 1) if humidity else None,
        "location": location,
        "recordedAt": datetime.now(timezone.utc).isoformat()
    }).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            res_body = json.loads(response.read().decode("utf-8"))
            print(f"[TELEMETRY SENT] Status: {status} | Batch: {batch_id} | Device: {device_id} | "
                  f"Temp: {temperature:.1f}°C | Hum: {humidity:.1f}% | Ingestion ID: {res_body.get('id')}")
            return res_body
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[INGESTION ERROR] HTTP {e.code}: {err_msg}")
        return None
    except Exception as e:
        print(f"[CONNECTION ERROR] Could not reach backend at {url}: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="MedChain Dev IoT Sensor Simulator — Ingests real telemetry via HTTP REST API"
    )
    parser.add_argument("--batchId", required=True, help="Target Medicine Batch ID (e.g. MC-2026-00005)")
    parser.add_argument("--deviceId", default="DEV-COLD-IOT-01", help="Virtual sensor device hardware identifier")
    parser.add_argument("--url", default="http://localhost:8080", help="MedChain backend base URL")
    parser.add_argument("--email", default="manufacturer@apexpharma.com", help="Account email for API authentication")
    parser.add_argument("--password", default="password123", help="Account password")
    parser.add_argument("--token", default=None, help="Existing JWT token (if provided, skips login)")
    parser.add_argument("--location", default="Cold Storage Bay 4, Warehouse A", help="Sensor deployment location")
    parser.add_argument("--count", type=int, default=1, help="Number of telemetry packets to send")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval (seconds) between packets")

    group = parser.add_mutually_exclusive_group()
    group.add_argument("--normal", action="store_true", default=True, help="Simulate normal cold-chain (4.0°C - 5.5°C)")
    group.add_argument("--spike", action="store_true", help="Simulate critical temperature excursion (11.5°C - 13.0°C)")
    group.add_argument("--freeze", action="store_true", help="Simulate sub-zero freezing breach (-2.0°C - -0.5°C)")

    args = parser.parse_args()

    token = args.token
    if not token:
        token = login_for_token(args.url, args.email, args.password)
        if not token:
            print("[WARN] Proceeding without JWT token (request may be rejected if endpoint is protected).")

    print(f"\n=======================================================")
    print(f"🚀 MEDCHAIN DEV IOT SENSOR SIMULATOR INITIALIZED")
    print(f"Target Batch:   {args.batchId}")
    print(f"Sensor Device:  {args.deviceId}")
    print(f"Endpoint:       {args.url}/api/v1/cold-chain/readings")
    if args.spike:
        mode_str = "🔥 EXCURSION SPIKE (11.5°C - 13.0°C)"
        base_temp = 12.0
    elif args.freeze:
        mode_str = "❄️ FREEZING BREACH (-2.0°C - -0.5°C)"
        base_temp = -1.5
    else:
        mode_str = "✅ NORMAL RANGE (4.0°C - 5.5°C)"
        base_temp = 4.8
    print(f"Telemetry Mode: {mode_str}")
    print(f"Packet Count:   {args.count}")
    print(f"=======================================================\n")

    for i in range(args.count):
        # Deterministic variation around base_temp based on packet index
        variance = (i % 3) * 0.3 - 0.3
        current_temp = base_temp + variance
        current_hum = 52.0 + (i % 4) * 0.8

        send_reading(
            base_url=args.url,
            token=token,
            batch_id=args.batchId,
            device_id=args.deviceId,
            temperature=current_temp,
            humidity=current_hum,
            location=args.location
        )

        if i < args.count - 1:
            time.sleep(args.interval)

    print("\n[COMPLETE] Sensor simulation finished.")


if __name__ == "__main__":
    main()
