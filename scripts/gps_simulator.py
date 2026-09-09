#!/usr/bin/env python3
"""
MedChain GPS Simulator
Simulates realistic real-time telemetry from an on-vehicle IoT tracker.
Sends HTTP POST requests to /api/tracking/location with GPS coordinates,
speed, heading, altitude, and timestamp.
"""

import argparse
import datetime
import math
import sys
import time
import requests

RAICHUR_TO_BLR_CORRIDOR = [
    (16.2120, 77.3439, "Origin: Raichur Facility"),
    (15.9000, 77.1500, "NH 150A: Raichur District Exit"),
    (15.5800, 76.9500, "NH 150A: Bellary District Entry"),
    (15.1394, 76.9214, "Bellary Bypass Junction"),
    (14.7500, 76.6500, "Kudligi Toll Plaza"),
    (14.2287, 76.3980, "Chitradurga NH 48 Interchange"),
    (13.9200, 76.6200, "Sira Highway Stretch"),
    (13.3409, 77.1010, "Tumkur Tollway"),
    (13.1000, 77.3500, "Nelamangala Toll Plaza"),
    (12.9716, 77.5946, "Bangalore Outer Ring Road"),
    (12.8452, 77.6602, "Destination: Bangalore Facility"),
]

def calculate_heading(lat1, lon1, lat2, lon2):
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    theta = math.atan2(y, x)
    return (math.degrees(theta) + 360) % 360

def interpolate_points(waypoints, total_steps):
    if len(waypoints) < 2:
        return waypoints
    segments = len(waypoints) - 1
    steps_per_segment = max(1, total_steps // segments)
    interpolated = []
    for i in range(segments):
        start_lat, start_lng, start_name = waypoints[i]
        end_lat, end_lng, end_name = waypoints[i+1]
        for s in range(steps_per_segment):
            t = s / float(steps_per_segment)
            lat = start_lat + t * (end_lat - start_lat)
            lng = start_lng + t * (end_lng - start_lng)
            interpolated.append((lat, lng, f"{start_name} -> {end_name} ({int(t*100)}%)"))
    final_lat, final_lng, final_name = waypoints[-1]
    interpolated.append((final_lat, final_lng, final_name))
    return interpolated

def run_simulation():
    parser = argparse.ArgumentParser(description="MedChain Real-Time GPS Tracking Simulator")
    parser.add_argument("--shipment", type=str, required=True, help="Shipment Number (e.g. MC-SHIP-2026-0001) or Transfer UUID")
    parser.add_argument("--device-id", type=str, default="DEV-TRUCK-KA36", help="Tracking Device Hardware ID")
    parser.add_argument("--api-url", type=str, default="http://localhost:8080/api/tracking/location", help="Ingestion API endpoint")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval between telemetry transmissions in seconds")
    parser.add_argument("--steps", type=int, default=25, help="Number of intermediate waypoints along the route")
    parser.add_argument("--speed", type=float, default=65.0, help="Simulated truck cruise speed (km/h)")
    parser.add_argument("--deviate-at", type=int, default=-1, help="Step index at which to inject route deviation")
    parser.add_argument("--stop-at", type=int, default=-1, help="Step index at which to simulate truck stoppage")
    parser.add_argument("--stop-duration", type=int, default=3, help="Number of ticks truck stays stopped")
    parser.add_argument("--once", action="store_true", help="Send a single location point and exit")
    parser.add_argument("--lat", type=float, default=None, help="Custom single latitude")
    parser.add_argument("--lng", type=float, default=None, help="Custom single longitude")

    args = parser.parse_args()

    print("=" * 80)
    print("MEDCHAIN IOT TELEMETRY SIMULATOR")
    print(f"Shipment    : {args.shipment}")
    print(f"Device ID   : {args.device_id}")
    print(f"Target API  : {args.api_url}")
    print(f"Update Rate : every {args.interval}s")
    print("=" * 80)

    if args.once and args.lat is not None and args.lng is not None:
        payload = {
            "shipmentId": args.shipment,
            "trackingDeviceId": args.device_id,
            "latitude": args.lat,
            "longitude": args.lng,
            "speedKph": args.speed,
            "headingDegrees": 180.0,
            "altitudeMeters": 450.0,
            "accuracyMeters": 3.5,
            "recordedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        res = requests.post(args.api_url, json=payload)
        print(f"Sent single ping: status={res.status_code}, response={res.text}")
        return

    route = interpolate_points(RAICHUR_TO_BLR_CORRIDOR, args.steps)
    print(f"Prepared route with {len(route)} waypoints from Raichur to Bangalore.")

    stop_counter = 0

    for idx, (lat, lng, desc) in enumerate(route):
        if args.deviate_at != -1 and idx >= args.deviate_at and idx < args.deviate_at + 3:
            lat += 0.8
            desc = f"[ANOMALY: OFF-ROUTE DEVIATION] {desc}"

        curr_speed = args.speed
        if args.stop_at != -1 and idx == args.stop_at and stop_counter < args.stop_duration:
            curr_speed = 0.0
            desc = f"[ALERT: VEHICLE STOPPED] {desc}"
            stop_counter += 1

        if idx < len(route) - 1:
            next_lat, next_lng, _ = route[idx + 1]
            heading = calculate_heading(lat, lng, next_lat, next_lng)
        else:
            heading = 180.0

        now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
        payload = {
            "shipmentId": args.shipment,
            "trackingDeviceId": args.device_id,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "speedKph": round(curr_speed, 1),
            "headingDegrees": round(heading, 1),
            "altitudeMeters": 420.0 + (idx % 10) * 5.0,
            "accuracyMeters": 3.0,
            "recordedAt": now_utc
        }

        try:
            start_t = time.time()
            res = requests.post(args.api_url, json=payload, timeout=5)
            elapsed_ms = int((time.time() - start_t) * 1000)

            if res.status_code == 200:
                print(f"[{idx+1:02d}/{len(route):02d}] HTTP {res.status_code} ({elapsed_ms}ms) | "
                      f"Pos: ({payload['latitude']:.4f}, {payload['longitude']:.4f}) | "
                      f"Speed: {payload['speedKph']} km/h | {desc}")
            else:
                print(f"[{idx+1:02d}/{len(route):02d}] HTTP {res.status_code} - Error: {res.text}")
        except Exception as e:
            print(f"[{idx+1:02d}/{len(route):02d}] Request failed: {e}")

        if args.once:
            break

        time.sleep(args.interval)

    print("=" * 80)
    print("Simulation complete. All telemetry points dispatched.")
    print("=" * 80)

if __name__ == "__main__":
    run_simulation()
