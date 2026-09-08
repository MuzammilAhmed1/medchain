from datetime import datetime, timedelta, timezone

from app.models import BatchRiskRequest, RiskLevel
from app.risk_engine import analyze_batch

NOW = datetime(2026, 3, 1, tzinfo=timezone.utc)


def make_request(**overrides):
    base = dict(
        batchId="MC-2026-TEST",
        status="IN_TRANSIT",
        manufacturingDate=NOW - timedelta(days=30),
        expiryDate=NOW + timedelta(days=365),
        transfers=[],
        blockchainEvents=[],
        asOf=NOW,
    )
    base.update(overrides)
    return BatchRiskRequest(**base)


def test_clean_batch_is_low_risk():
    request = make_request(
        transfers=[
            {
                "from": "Manufacturer",
                "to": "Distributor",
                "initiatedAt": NOW - timedelta(hours=10),
                "receivedAt": NOW - timedelta(hours=2),
            }
        ],
        blockchainEvents=[
            {"type": "TRANSFER_INITIATED", "timestamp": NOW - timedelta(hours=10)},
            {"type": "TRANSFER_RECEIVED", "timestamp": NOW - timedelta(hours=2)},
        ],
    )
    result = analyze_batch(request)
    assert result.risk_level == RiskLevel.LOW
    assert result.risk_score < 34


def test_recalled_batch_is_high_risk():
    request = make_request(status="RECALLED")
    result = analyze_batch(request)
    assert result.risk_level == RiskLevel.HIGH
    assert "recalled" in result.reason.lower()


def test_severely_delayed_transfer_flagged():
    request = make_request(
        transfers=[
            {
                "from": "Manufacturer",
                "to": "Distributor",
                "initiatedAt": NOW - timedelta(days=6),
                "receivedAt": None,
            }
        ],
    )
    result = analyze_batch(request)
    assert result.risk_score >= 35
    assert any(r.code == "PENDING_TRANSFER_SEVERE_DELAY" for r in result.triggered_rules)


def test_mild_delay_flagged_lower_than_severe():
    request = make_request(
        transfers=[
            {
                "from": "Manufacturer",
                "to": "Distributor",
                "initiatedAt": NOW - timedelta(hours=60),
                "receivedAt": None,
            }
        ],
    )
    result = analyze_batch(request)
    assert any(r.code == "PENDING_TRANSFER_DELAY" for r in result.triggered_rules)
    assert not any(r.code == "PENDING_TRANSFER_SEVERE_DELAY" for r in result.triggered_rules)


def test_frequent_ownership_hops_flagged():
    request = make_request(
        transfers=[
            {"from": "A", "to": "B", "initiatedAt": NOW - timedelta(hours=48), "receivedAt": NOW - timedelta(hours=40)},
            {"from": "B", "to": "C", "initiatedAt": NOW - timedelta(hours=30), "receivedAt": NOW - timedelta(hours=20)},
            {"from": "C", "to": "D", "initiatedAt": NOW - timedelta(hours=10), "receivedAt": None},
        ],
    )
    result = analyze_batch(request)
    assert any(r.code == "OWNERSHIP_HOP_FREQUENCY" for r in result.triggered_rules)


def test_expired_batch_flagged():
    request = make_request(status="IN_TRANSIT", expiryDate=NOW - timedelta(days=5))
    result = analyze_batch(request)
    assert any(r.code == "EXPIRED_STOCK" for r in result.triggered_rules)


def test_verified_batch_ignores_expiry_rule():
    request = make_request(status="VERIFIED", expiryDate=NOW - timedelta(days=5))
    result = analyze_batch(request)
    assert not any(r.code in ("EXPIRED_STOCK", "EXPIRY_IMMINENT", "EXPIRY_APPROACHING") for r in result.triggered_rules)


def test_missing_blockchain_confirmation_flagged():
    request = make_request(
        transfers=[
            {
                "from": "Manufacturer",
                "to": "Distributor",
                "initiatedAt": NOW - timedelta(hours=10),
                "receivedAt": NOW - timedelta(hours=2),
            }
        ],
        blockchainEvents=[],
    )
    result = analyze_batch(request)
    assert any(r.code == "MISSING_BLOCKCHAIN_CONFIRMATION" for r in result.triggered_rules)


def test_score_is_capped_at_100():
    request = make_request(
        status="RECALLED",
        expiryDate=NOW - timedelta(days=5),
        transfers=[
            {"from": "A", "to": "B", "initiatedAt": NOW - timedelta(days=8), "receivedAt": None},
            {"from": "B", "to": "C", "initiatedAt": NOW - timedelta(hours=48), "receivedAt": NOW - timedelta(hours=40)},
            {"from": "C", "to": "D", "initiatedAt": NOW - timedelta(hours=30), "receivedAt": None},
        ],
        blockchainEvents=[],
    )
    result = analyze_batch(request)
    assert result.risk_score == 100
