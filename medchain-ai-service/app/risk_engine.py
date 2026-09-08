"""Rule-based Medicine Supply Risk Analysis.

Deliberately not a trained ML model: with the data volume a real MVP
deployment would have (a handful of transfers per batch), a hand-tuned
rule engine is both more explainable and more reliable than a model that
would be undertrained. Each rule below is independent, auditable, and
contributes a bounded number of points to the final 0-100 score.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from app.models import (
    BatchRiskRequest,
    RiskAnalysisResponse,
    RiskLevel,
    TransferRecord,
    TriggeredRule,
)

# Tunable thresholds. Kept as module constants (not magic numbers inline)
# so the recommended MVP defaults are easy to find and adjust.
PENDING_DELAY_WARN_HOURS = 48
PENDING_DELAY_SEVERE_HOURS = 120
HOP_WINDOW_HOURS = 72
HOP_COUNT_THRESHOLD = 3
EXPIRY_WARN_DAYS = 90
EXPIRY_URGENT_DAYS = 30
BLOCKCHAIN_CONFIRMATION_TOLERANCE_HOURS = 24

RECALLED_SCORE = 90


def _to_utc(dt: datetime) -> datetime:
    """Treat naive datetimes as UTC so every comparison is apples-to-apples."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def rule_pending_transfer_delay(
    transfers: List[TransferRecord], as_of: datetime
) -> Optional[TriggeredRule]:
    pending = [t for t in transfers if t.received_at is None]
    if not pending:
        return None

    worst_hours = max(
        (as_of - _to_utc(t.initiated_at)).total_seconds() / 3600 for t in pending
    )

    if worst_hours >= PENDING_DELAY_SEVERE_HOURS:
        return TriggeredRule(
            code="PENDING_TRANSFER_SEVERE_DELAY",
            points=35,
            message=(
                f"A transfer has been in transit for over "
                f"{int(worst_hours // 24)} days without confirmation."
            ),
        )
    if worst_hours >= PENDING_DELAY_WARN_HOURS:
        return TriggeredRule(
            code="PENDING_TRANSFER_DELAY",
            points=15,
            message="Unusual delay detected between transfers.",
        )
    return None


def rule_ownership_hop_frequency(transfers: List[TransferRecord]) -> Optional[TriggeredRule]:
    if len(transfers) < HOP_COUNT_THRESHOLD:
        return None

    times = sorted(_to_utc(t.initiated_at) for t in transfers)
    window = timedelta(hours=HOP_WINDOW_HOURS)

    for i in range(len(times) - HOP_COUNT_THRESHOLD + 1):
        if times[i + HOP_COUNT_THRESHOLD - 1] - times[i] <= window:
            return TriggeredRule(
                code="OWNERSHIP_HOP_FREQUENCY",
                points=20,
                message=(
                    f"Ownership changed {HOP_COUNT_THRESHOLD}+ times within "
                    f"{HOP_WINDOW_HOURS} hours, more hops than this route typically sees."
                ),
            )
    return None


def rule_expiry_proximity(
    status: str, expiry_date: datetime, as_of: datetime
) -> Optional[TriggeredRule]:
    if status == "VERIFIED":
        return None

    days_to_expiry = (_to_utc(expiry_date) - as_of).days

    if days_to_expiry < 0:
        return TriggeredRule(
            code="EXPIRED_STOCK",
            points=40,
            message="This batch has passed its expiry date and is still marked in circulation.",
        )
    if days_to_expiry <= EXPIRY_URGENT_DAYS:
        return TriggeredRule(
            code="EXPIRY_IMMINENT",
            points=25,
            message=f"Batch expires in {days_to_expiry} days and has not completed verification.",
        )
    if days_to_expiry <= EXPIRY_WARN_DAYS:
        return TriggeredRule(
            code="EXPIRY_APPROACHING",
            points=15,
            message=f"Batch expires in {days_to_expiry} days.",
        )
    return None


def rule_missing_blockchain_confirmation(
    transfers: List[TransferRecord], blockchain_event_timestamps: List[datetime]
) -> Optional[TriggeredRule]:
    if not transfers:
        return None

    tolerance = timedelta(hours=BLOCKCHAIN_CONFIRMATION_TOLERANCE_HOURS)
    normalized_events = [_to_utc(ts) for ts in blockchain_event_timestamps]

    def has_nearby_event(target: datetime) -> bool:
        return any(abs(target - ev) <= tolerance for ev in normalized_events)

    missing = 0
    for t in transfers:
        if not has_nearby_event(_to_utc(t.initiated_at)):
            missing += 1
        if t.received_at is not None and not has_nearby_event(_to_utc(t.received_at)):
            missing += 1

    if missing == 0:
        return None
    return TriggeredRule(
        code="MISSING_BLOCKCHAIN_CONFIRMATION",
        points=min(20, missing * 10),
        message=(
            f"{missing} transfer event(s) have no matching blockchain record "
            "within the expected confirmation window."
        ),
    )


def rule_recalled(status: str) -> Optional[TriggeredRule]:
    if status != "RECALLED":
        return None
    return TriggeredRule(
        code="RECALLED",
        points=RECALLED_SCORE,
        message="Batch has been recalled by the manufacturer.",
    )


RECOMMENDATIONS = {
    "RECALLED": "Quarantine remaining stock immediately and confirm no units have reached patients.",
    "EXPIRED_STOCK": "Remove this batch from circulation and confirm proper disposal.",
    "EXPIRY_IMMINENT": "Prioritize this batch for distribution or verification before it expires.",
    "EXPIRY_APPROACHING": "Monitor remaining shelf life; no immediate action required.",
    "PENDING_TRANSFER_SEVERE_DELAY": "Contact the current custodian to confirm shipment status without delay.",
    "PENDING_TRANSFER_DELAY": "Verify the shipment and investigate the transfer history.",
    "OWNERSHIP_HOP_FREQUENCY": "Review the transfer history for this batch before it moves further.",
    "MISSING_BLOCKCHAIN_CONFIRMATION": "Reconcile the off-chain transfer log against blockchain records.",
}

DEFAULT_REASON = "No anomalies detected across transfer timing, expiry, or blockchain records."
DEFAULT_RECOMMENDATION = "No action needed. Continue routine monitoring."


def level_for_score(score: int) -> RiskLevel:
    if score >= 70:
        return RiskLevel.HIGH
    if score >= 34:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def analyze_batch(request: BatchRiskRequest) -> RiskAnalysisResponse:
    as_of = _to_utc(request.as_of) if request.as_of else datetime.now(timezone.utc)

    blockchain_timestamps = [e.timestamp for e in request.blockchain_events]

    triggered: List[TriggeredRule] = []
    for rule_result in (
        rule_recalled(request.status),
        rule_pending_transfer_delay(request.transfers, as_of),
        rule_ownership_hop_frequency(request.transfers),
        rule_expiry_proximity(request.status, request.expiry_date, as_of),
        rule_missing_blockchain_confirmation(request.transfers, blockchain_timestamps),
    ):
        if rule_result is not None:
            triggered.append(rule_result)

    score = min(100, sum(r.points for r in triggered))
    level = level_for_score(score)

    if triggered:
        top_rule = max(triggered, key=lambda r: r.points)
        reason = top_rule.message
        recommendation = RECOMMENDATIONS.get(top_rule.code, DEFAULT_RECOMMENDATION)
    else:
        reason = DEFAULT_REASON
        recommendation = DEFAULT_RECOMMENDATION

    return RiskAnalysisResponse(
        batch_id=request.batch_id,
        risk_score=score,
        risk_level=level,
        reason=reason,
        recommendation=recommendation,
        triggered_rules=triggered,
    )
