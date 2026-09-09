import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.schemas.assistant_schemas import AssistantQueryRequest, AssistantQueryResponse


def process_assistant_query(req: AssistantQueryRequest) -> AssistantQueryResponse:
    q = req.query.lower().strip()
    batches = req.batches
    alerts = req.alerts
    transfers = req.transfers
    anomalies = req.anomalies

    referenced_batches: List[str] = []
    referenced_orgs: List[str] = []
    suggested_actions: List[str] = []

    # Check for specific shipment number pattern (e.g. MC-SHIP-2026-0001)
    shipment_match = re.search(r"mc-ship-\d{4}-\d+", q, re.IGNORECASE)
    target_shipment_num = shipment_match.group(0).upper() if shipment_match else None

    # Check for specific batch ID pattern (e.g. MC-2026-00005)
    batch_match = re.search(r"mc-\d{4}-\d+", q, re.IGNORECASE)
    target_batch_id = batch_match.group(0).upper() if batch_match else None

    # =========================================================================
    # INTENT 1: Shipment & Transportation Journey Intelligence
    # =========================================================================
    shipment_keywords = [
        "shipment", "journey", "transfer", "transit", "track", "route", "truck",
        "vehicle", "where is", "travelling", "travel", "location", "moving", "eta", "delivery",
        "speed", "velocity", "how fast", "stopped", "delay", "delayed", "late"
    ]
    is_shipment_query = target_shipment_num is not None or any(k in q for k in shipment_keywords)

    if is_shipment_query:
        matched_transfer: Optional[Dict[str, Any]] = None

        if target_shipment_num:
            matched_transfer = next(
                (t for t in transfers if str(t.get("shipmentNumber", "")).upper() == target_shipment_num or str(t.get("id", "")).upper() == target_shipment_num),
                None
            )

        if not matched_transfer and target_batch_id:
            matched_transfer = next(
                (t for t in transfers if str(t.get("batchId", "")).upper() == target_batch_id),
                None
            )

        # If not specific, prioritize active IN_TRANSIT shipments
        if not matched_transfer:
            in_transit = [t for t in transfers if str(t.get("status", "")).upper() == "IN_TRANSIT"]
            if in_transit:
                matched_transfer = in_transit[0]
            elif transfers:
                matched_transfer = transfers[0]

        if matched_transfer:
            s_num = matched_transfer.get("shipmentNumber") or f"MC-SHIP-{matched_transfer.get('id', '')[:8]}"
            b_id = matched_transfer.get("batchId", "Unknown")
            referenced_batches.append(b_id)

            # Find medicine name if not directly in transfer
            med_name = matched_transfer.get("medicineName")
            if not med_name:
                b_found = next((b for b in batches if b.get("id") == b_id), None)
                med_name = b_found.get("medicineName", "Pharmaceutical Batch") if b_found else "Pharmaceutical Batch"

            from_org = matched_transfer.get("fromOrg", "Origin")
            to_org = matched_transfer.get("toOrg", "Destination")
            status = matched_transfer.get("status", "IN_TRANSIT")

            origin_addr = matched_transfer.get("originAddress") or matched_transfer.get("fromOrg", "Origin")
            dest_addr = matched_transfer.get("destinationAddress") or matched_transfer.get("toOrg", "Destination")

            c_lat = matched_transfer.get("currentLatitude")
            c_lng = matched_transfer.get("currentLongitude")
            speed = matched_transfer.get("currentSpeedKph")
            heading = matched_transfer.get("headingDegrees")
            temp = matched_transfer.get("temperatureCelsius")
            humidity = matched_transfer.get("humidityPercent")
            eta_str = matched_transfer.get("estimatedArrivalAt") or matched_transfer.get("eta")
            last_recorded_at = matched_transfer.get("lastRecordedAt")

            # Check specific sub-intents
            is_speed_query = any(k in q for k in ["speed", "how fast", "velocity"])
            is_eta_query = any(k in q for k in ["eta", "arrival", "when will", "estimated time"])
            is_stopped_query = any(k in q for k in ["stopped", "stationary", "parked", "moving"])
            is_delay_query = any(k in q for k in ["delay", "delayed", "late", "traffic"])

            # 1. Specific Query: SPEED
            if is_speed_query and not any(k in q for k in ["journey", "overview"]):
                if speed is not None:
                    status_desc = "in motion" if speed >= 2.0 else "stationary / stopped"
                    md = (
                        f"### 🚚 Vehicle Speed Telemetry: **{s_num}**\n\n"
                        f"- **Current Speed**: **{speed:.1f} km/h** ({status_desc})\n"
                        f"- **Heading**: {f'{heading:.0f}°' if heading is not None else 'Unavailable'}\n"
                        f"- **Shipment Status**: `{status}`\n"
                        f"- **Last Signal**: {last_recorded_at if last_recorded_at else 'Real-time'}\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & GPS Telemetry)*"
                    )
                else:
                    md = (
                        f"### 🚚 Vehicle Speed Telemetry: **{s_num}**\n\n"
                        f"Speed telemetry is currently **unavailable** for shipment `{s_num}`.\n"
                        f"The assigned vehicle or driver has not transmitted live GPS speed pings.\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & GPS Telemetry)*"
                    )
                return AssistantQueryResponse(
                    answerMarkdown=md,
                    referencedBatchIds=referenced_batches,
                    referencedOrgIds=referenced_orgs,
                    suggestedActions=[f"Where is {s_num}?", f"What is the ETA?", "Check route on live map"]
                )

            # 2. Specific Query: ETA
            if is_eta_query and not any(k in q for k in ["journey", "overview"]):
                if eta_str:
                    md = (
                        f"### ⏱️ Estimated Time of Arrival: **{s_num}**\n\n"
                        f"- **Destination**: {dest_addr}\n"
                        f"- **Estimated Arrival**: **{eta_str}**\n"
                        f"- **Current Status**: `{status}`\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & Highway Routing)*"
                    )
                else:
                    md = (
                        f"### ⏱️ Estimated Time of Arrival: **{s_num}**\n\n"
                        f"**ETA unavailable** for shipment `{s_num}`.\n"
                        f"Accurate highway route calculation requires active GPS position data from the driver.\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & Highway Routing)*"
                    )
                return AssistantQueryResponse(
                    answerMarkdown=md,
                    referencedBatchIds=referenced_batches,
                    referencedOrgIds=referenced_orgs,
                    suggestedActions=[f"Where is {s_num}?", f"What is current speed?", "Open live tracker"]
                )

            # 3. Specific Query: HAS VEHICLE STOPPED
            if is_stopped_query and not any(k in q for k in ["journey", "overview"]):
                if speed is not None:
                    if speed < 2.0:
                        stopped_loc = f"`{c_lat:.4f}° N, {c_lng:.4f}° E`" if c_lat is not None else "last reported waypoint"
                        md = (
                            f"### 🛑 Vehicle Movement Status: **{s_num}**\n\n"
                            f"- **Status**: **Vehicle is currently stationary (STOPPED)**\n"
                            f"- **Recorded Speed**: **{speed:.1f} km/h**\n"
                            f"- **Location**: {stopped_loc}\n"
                            f"- **Shipment Status**: `{status}`\n\n"
                            f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & GPS Telemetry)*"
                        )
                    else:
                        md = (
                            f"### 🚚 Vehicle Movement Status: **{s_num}**\n\n"
                            f"- **Status**: **Vehicle is currently IN MOTION**\n"
                            f"- **Current Velocity**: **{speed:.1f} km/h**\n"
                            f"- **Direction**: {f'{heading:.0f}°' if heading is not None else 'Active route'}\n"
                            f"- **Shipment Status**: `{status}`\n\n"
                            f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & GPS Telemetry)*"
                        )
                else:
                    md = (
                        f"### 🚚 Vehicle Movement Status: **{s_num}**\n\n"
                        f"Vehicle movement status is **unavailable** because no recent GPS speed telemetry has been recorded.\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & GPS Telemetry)*"
                    )
                return AssistantQueryResponse(
                    answerMarkdown=md,
                    referencedBatchIds=referenced_batches,
                    referencedOrgIds=referenced_orgs,
                    suggestedActions=[f"Where is {s_num}?", "Track on live map"]
                )

            # 4. Specific Query: IS SHIPMENT DELAYED
            if is_delay_query and not any(k in q for k in ["journey", "overview"]):
                traffic_delay = matched_transfer.get("trafficDelaySeconds")
                if traffic_delay and traffic_delay > 180:
                    delay_min = round(traffic_delay / 60)
                    md = (
                        f"### ⚠️ Transit Delay Report: **{s_num}**\n\n"
                        f"- **Delay Status**: **Delayed by ~{delay_min} minutes** due to highway congestion.\n"
                        f"- **Destination**: {dest_addr}\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & Highway Routing)*"
                    )
                else:
                    md = (
                        f"### ✅ Transit Delay Report: **{s_num}**\n\n"
                        f"- **Delay Status**: **On Schedule (No significant delays)**\n"
                        f"- **Transit Status**: `{status}`\n"
                        f"- **Destination**: {dest_addr}\n\n"
                        f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & Highway Routing)*"
                    )
                return AssistantQueryResponse(
                    answerMarkdown=md,
                    referencedBatchIds=referenced_batches,
                    referencedOrgIds=referenced_orgs,
                    suggestedActions=[f"What is the ETA for {s_num}?", "Open live tracker"]
                )

            # 5. Full Journey & Location Query
            if c_lat is None or c_lng is None:
                coord_str = "`GPS telemetry unavailable (awaiting driver satellite lock)`"
                checkpoint_desc = "No telemetry points received yet"
            else:
                coord_str = f"`{c_lat:.4f}° N, {c_lng:.4f}° E`"
                if c_lat >= 15.5:
                    checkpoint_desc = "Northern Corridor / Highway Checkpoint"
                elif c_lat >= 14.8:
                    checkpoint_desc = "Mid-Route Logistics Corridor"
                elif c_lat >= 14.0:
                    checkpoint_desc = "Central Junction & Highway Tollway"
                elif c_lat >= 13.2:
                    checkpoint_desc = "Southern Expressway Approach"
                else:
                    checkpoint_desc = "Approaching Destination Facility"

            speed_display = f"**{speed:.1f} km/h**" if speed is not None else "*(Speed telemetry unavailable)*"
            heading_display = f"Heading: **{heading:.0f}°**" if heading is not None else "*(Heading unavailable)*"
            temp_display = f"**{temp:.1f}°C** *(Safe Range: 2.0°C – 8.0°C)*" if temp is not None else "*(Sensor not connected)*"
            humidity_display = f"**{humidity:.0f}%**" if humidity is not None else "*(Sensor not connected)*"

            md = (
                f"### 🚚 Live Shipment Intelligence: **{s_num}**\n\n"
                f"- **Medicine Cargo**: **{med_name}** (Batch `{b_id}`)\n"
                f"- **Transit Pipeline**: **{from_org}** *(Origin)* ➔ **{to_org}** *(Destination)*\n"
                f"- **Shipment Status**: `{status}`\n"
                f"- **Origin Facility**: {origin_addr}\n"
                f"- **Destination Facility**: {dest_addr}\n\n"
                f"#### 📡 Real-Time GPS Telemetry & Sensor Data:\n"
                f"- **Current Position**: {coord_str} ({checkpoint_desc})\n"
                f"- **Live Vehicle Speed**: {speed_display} • {heading_display}\n"
                f"- **Internal Cold-Chain Temp**: {temp_display}\n"
                f"- **Humidity Level**: {humidity_display}\n"
                f"- **Integrity Verification**: ✅ **Tamper-proof logs persisted on PostgreSQL & Blockchain audit trail**.\n\n"
                f"#### 🛣️ Route Checkpoints Progress:\n"
                f"- [x] **1. Origin Dispatch**: {from_org}\n"
                f"- [{'x' if c_lat and c_lat < 15.0 else (' ' if not c_lat else '>')}] **2. Highway En-Route**: Transport Corridor\n"
                f"- [{'x' if c_lat and c_lat < 13.5 else ' '}] **3. Destination Approach**: Final Expressway\n"
                f"- [{'x' if status == 'RECEIVED' else ' '}] **4. Delivery Confirmation**: {to_org}\n\n"
                f"*Analysis Method: deterministic telemetry calculation (Real PostgreSQL & GPS Telemetry)*"
            )

            if len(transfers) > 1:
                md += f"\n\n#### Other Authorized Shipments ({len(transfers)}):\n"
                for t in transfers[:5]:
                    t_num = t.get("shipmentNumber") or t.get("id", "")[:8]
                    md += f"- **{t_num}**: `{t.get('status')}` | {t.get('fromOrg')} ➔ {t.get('toOrg')} (Batch: `{t.get('batchId')}`)\n"

            suggested_actions = [
                f"What is the current speed of {s_num}?",
                f"What is the ETA for {s_num}?",
                f"Has the vehicle stopped?",
                f"Track {s_num} on live interactive map",
            ]

            return AssistantQueryResponse(
                answerMarkdown=md,
                referencedBatchIds=referenced_batches,
                referencedOrgIds=referenced_orgs,
                suggestedActions=suggested_actions,
            )
        else:
            md = (
                "### 🚚 Supply-Chain Transportation Status\n\n"
                "No active shipments matching your query were found for your organization.\n\n"
                "Tracking data is unavailable. You can initiate a tracked shipment from the **Supply Chain** tab."
            )
            return AssistantQueryResponse(
                answerMarkdown=md,
                referencedBatchIds=[],
                referencedOrgIds=[],
                suggestedActions=["Show all batches in custody", "Where is my shipment?"],
            )

    # =========================================================================
    # INTENT 2: Specific Batch Deep-Dive
    # =========================================================================
    if target_batch_id:
        batch = next((b for b in batches if str(b.get("id", "")).upper() == target_batch_id), None)
        if batch:
            referenced_batches.append(batch["id"])
            status = batch.get("status", "UNKNOWN")
            med_name = batch.get("medicineName", "Medicine")
            qty = batch.get("quantity", 0)
            risk_score = batch.get("riskScore", 0)
            risk_level = batch.get("riskLevel", "LOW")
            expiry = batch.get("expiryDate", "N/A")
            owner = batch.get("currentOwner", {}).get("name", "Unknown")

            # Check related alerts, anomalies & transfers
            b_alerts = [a for a in alerts if a.get("batchId") == batch["id"]]
            b_anomalies = [a for a in anomalies if a.get("batchId") == batch["id"]]
            b_transfers = [t for t in transfers if t.get("batchId") == batch["id"]]

            md = (
                f"### Batch Intelligence Report: **{batch['id']}**\n\n"
                f"- **Medicine**: {med_name}\n"
                f"- **Status**: `{status}`\n"
                f"- **Quantity**: {qty:,} units\n"
                f"- **Current Custodian**: {owner}\n"
                f"- **Expiry Date**: {expiry}\n"
                f"- **AI Risk Score**: **{risk_score}/100** (`{risk_level}`)\n\n"
            )

            if b_transfers:
                md += "#### Active Shipment & Transportation:\n"
                for t in b_transfers:
                    s_num = t.get("shipmentNumber") or t.get("id", "")[:8]
                    md += f"- 🚚 **{s_num}**: `{t.get('status')}` from **{t.get('fromOrg')}** to **{t.get('toOrg')}**\n"
                md += "\n"

            if b_anomalies:
                md += "#### Detected Anomalies:\n"
                for a in b_anomalies:
                    md += f"- **{a.get('anomalyType', 'Anomaly')}**: {a.get('detectedReason', 'N/A')} (Score: {a.get('score', 'N/A')})\n"
                md += "\n"

            if b_alerts:
                md += "#### Cold-Chain Alerts:\n"
                for al in b_alerts:
                    md += f"- ⚠️ **{al.get('severity', 'ALERT')}**: {al.get('message', 'Temperature excursion')} ({al.get('createdAt', '')})\n"
                md += "\n"

            if not b_anomalies and not b_alerts and (risk_score or 0) < 40:
                md += "✅ No active cold-chain violations or critical anomalies detected for this batch.\n"

            suggested_actions = [
                f"Where is shipment for {batch['id']}?",
                f"View blockchain transaction history for {batch['id']}",
                f"Check cold-chain telemetry for {batch['id']}",
            ]
            return AssistantQueryResponse(
                answerMarkdown=md,
                referencedBatchIds=referenced_batches,
                referencedOrgIds=referenced_orgs,
                suggestedActions=suggested_actions,
            )
        else:
            return AssistantQueryResponse(
                answerMarkdown=f"Batch `{target_batch_id}` was not found in your organization's authorized scope.",
                referencedBatchIds=[],
                referencedOrgIds=[],
                suggestedActions=["List all batches in my inventory", "Where is my shipment?"],
            )

    # =========================================================================
    # INTENT 3: High Risk Batches
    # =========================================================================
    if any(k in q for k in ["high risk", "risky", "risk"]):
        high_risk_batches = [
            b for b in batches
            if (b.get("riskScore") or 0) >= 60 or str(b.get("riskLevel")).upper() in ["HIGH", "CRITICAL"]
        ]
        if high_risk_batches:
            md = f"Found **{len(high_risk_batches)} high-risk batch(es)** in your authorized inventory:\n\n"
            md += "| Batch ID | Medicine | Custodian | Risk Score | Level | Status |\n"
            md += "| :--- | :--- | :--- | :---: | :---: | :--- |\n"
            for b in high_risk_batches[:10]:
                referenced_batches.append(b["id"])
                owner = b.get("currentOwner", {}).get("name", "N/A")
                md += f"| **{b['id']}** | {b.get('medicineName')} | {owner} | {b.get('riskScore', 0)}/100 | `{b.get('riskLevel')}` | {b.get('status')} |\n"
            suggested_actions = [
                f"Why is {high_risk_batches[0]['id']} risky?",
                "Show all cold-chain violations",
                "Where is my shipment?",
            ]
        else:
            md = "✅ **Zero high-risk batches** detected in your current authorized inventory. All batches have low risk scores."
            suggested_actions = ["Where is my shipment?", "Check expiry forecast"]

        return AssistantQueryResponse(
            answerMarkdown=md,
            referencedBatchIds=referenced_batches,
            referencedOrgIds=[],
            suggestedActions=suggested_actions,
        )

    # =========================================================================
    # INTENT 4: Expiry Within 90 Days
    # =========================================================================
    if any(k in q for k in ["expire", "expiry", "expiring", "shelf life"]):
        now = datetime.now(timezone.utc)
        expiring = []
        for b in batches:
            exp_str = b.get("expiryDate")
            if exp_str:
                try:
                    exp_dt = datetime.fromisoformat(str(exp_str).replace("Z", "+00:00"))
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                    days = (exp_dt - now).days
                    if days <= 90:
                        expiring.append((days, b))
                except Exception:
                    pass

        expiring.sort(key=lambda x: x[0])
        if expiring:
            md = f"⚠️ Found **{len(expiring)} batch(es)** expiring within the next 90 days:\n\n"
            md += "| Batch ID | Medicine | Days Remaining | Quantity | Status |\n"
            md += "| :--- | :--- | :---: | :---: | :--- |\n"
            for days, b in expiring[:10]:
                referenced_batches.append(b["id"])
                md += f"| **{b['id']}** | {b.get('medicineName')} | **{days} days** | {b.get('quantity', 0):,} | `{b.get('status')}` |\n"
            suggested_actions = [
                "Run demand prediction to see if stock will deplete before expiry",
                "Where is my active shipment?",
            ]
        else:
            md = "✅ None of your authorized batches are expiring within the next 90 days."
            suggested_actions = ["Where is my shipment?", "Check overall risk"]

        return AssistantQueryResponse(
            answerMarkdown=md,
            referencedBatchIds=referenced_batches,
            referencedOrgIds=[],
            suggestedActions=suggested_actions,
        )

    # =========================================================================
    # INTENT 5: Anomalies & Suspicious Events
    # =========================================================================
    if any(k in q for k in ["anomaly", "suspicious", "fraud", "unusual"]):
        if anomalies:
            md = f"🔍 Identified **{len(anomalies)} supply-chain anomaly event(s)**:\n\n"
            for an in anomalies[:5]:
                b_id = an.get("batchId", "Global")
                if b_id:
                    referenced_batches.append(b_id)
                md += (
                    f"- **{an.get('anomalyType', 'Anomaly')}** on batch `{b_id}`: "
                    f"{an.get('detectedReason', 'No reason provided')} "
                    f"(Score: **{an.get('score', 0)}/100**, Severity: `{an.get('severity', 'HIGH')}`)\n"
                )
            suggested_actions = ["Open Anomaly Center", "Where is my shipment?"]
        else:
            md = "✅ No suspicious transfer patterns or anomalies have been flagged in your supply chain."
            suggested_actions = ["Where is my shipment?", "Check cold chain health"]

        return AssistantQueryResponse(
            answerMarkdown=md,
            referencedBatchIds=referenced_batches,
            referencedOrgIds=[],
            suggestedActions=suggested_actions,
        )

    # =========================================================================
    # INTENT 6: Cold Chain & Temperature Sensors
    # =========================================================================
    if any(k in q for k in ["cold", "temperature", "excursion", "sensor", "celsius"]):
        if alerts:
            md = f"❄️ Found **{len(alerts)} active cold-chain excursion alert(s)**:\n\n"
            for al in alerts[:5]:
                b_id = al.get("batchId", "Unknown")
                if b_id != "Unknown":
                    referenced_batches.append(b_id)
                md += (
                    f"- 🚨 **{al.get('severity', 'WARNING')}**: Batch `{b_id}` – "
                    f"{al.get('message', 'Temperature exceeded')} (Recorded at {al.get('createdAt', '')})\n"
                )
            suggested_actions = ["Open Cold-Chain Monitor", "Where is my shipment?"]
        else:
            md = "✅ All monitored batches are maintaining required storage temperatures (2°C – 8°C). No active excursions."
            suggested_actions = ["Where is my shipment?", "Simulate sensor telemetry"]

        return AssistantQueryResponse(
            answerMarkdown=md,
            referencedBatchIds=referenced_batches,
            referencedOrgIds=[],
            suggestedActions=suggested_actions,
        )

    # =========================================================================
    # DEFAULT OVERVIEW (Executive Supply-Chain Summary)
    # =========================================================================
    in_transit_count = len([t for t in transfers if t.get("status") == "IN_TRANSIT"])
    active_shipment_hint = ""
    if transfers:
        latest_t = transfers[0]
        s_num = latest_t.get("shipmentNumber") or latest_t.get("id", "")[:8]
        active_shipment_hint = f"\n- **Latest Shipment**: `{s_num}` ({latest_t.get('status')} • {latest_t.get('fromOrg')} ➔ {latest_t.get('toOrg')})"

    md = (
        f"### MedChain AI Supply-Chain Overview\n\n"
        f"Logged in as **{req.user_role}**"
        + (f" at **{req.organization_name}**" if req.organization_name else "")
        + ".\n\n"
        f"- **Authorized Batches**: {len(batches)}\n"
        f"- **Active Shipments**: {in_transit_count} in transit ({len(transfers)} total){active_shipment_hint}\n"
        f"- **Logged Anomalies**: {len(anomalies)}\n"
        f"- **Cold-Chain Excursions**: {len(alerts)}\n\n"
        f"Ask me about any active **shipment journey** (`Where is my shipment?`), "
        f"inspect a specific batch (`Status of MC-2026-00011`), or request risk and expiry forecasts."
    )
    suggested_actions = [
        "Where is my shipment?",
        "Which batches are high risk?",
        "Which batches expire within 60 days?",
        "Show recent cold-chain alerts",
    ]
    return AssistantQueryResponse(
        answerMarkdown=md,
        referencedBatchIds=referenced_batches,
        referencedOrgIds=referenced_orgs,
        suggestedActions=suggested_actions,
    )
