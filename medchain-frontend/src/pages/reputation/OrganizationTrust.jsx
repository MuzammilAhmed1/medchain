import { useEffect, useState } from "react";
import {
  Award,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Building2,
  CheckCircle2,
  XCircle,
  Thermometer,
} from "lucide-react";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui";
import { trustApi } from "../../services/trustApi";

export default function OrganizationTrust() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await trustApi.getAllScores();
      setScores(data || []);
    } catch (err) {
      setError(err.message || "Failed to load organization trust scores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 75) return "text-primary bg-primary-tint border-primary/30";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-danger bg-danger-tint border-danger/30";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Trust & Reputation"
        description="Dynamic reputation scoring (0–100) computed deterministically from verified custody transfers, delays, cold-chain compliance, and blockchain consistency."
        action={
          <button
            onClick={fetchScores}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-xs text-small text-ink hover:bg-canvas transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recalculate Scores
          </button>
        }
      />

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xs text-small">
          {error}
        </div>
      )}

      {loading && scores.length === 0 ? (
        <div className="p-16 text-center text-ink-muted">Computing organization reputation scores...</div>
      ) : scores.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-16 text-center text-ink-muted">
              <Building2 size={44} className="mx-auto mb-3 opacity-30 text-primary" />
              <p className="font-semibold text-ink text-body">No Registered Organizations</p>
              <p className="text-small mt-1">Register supply-chain partners to calculate trust scores.</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {scores.map((org) => {
            const colorClass = getScoreColor(org.score);
            return (
              <Card key={org.id || org.organizationId}>
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xs bg-canvas border border-border text-ink">
                        <Building2 size={22} />
                      </div>
                      <div>
                        <h3 className="text-h3 font-bold text-ink">{org.organizationName}</h3>
                        <span className="text-xs text-ink-muted block mt-0.5">
                          Evaluated: {new Date(org.calculatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className={`px-4 py-2 rounded-xs border text-center ${colorClass}`}>
                      <div className="text-h2 font-black leading-none">{org.score}</div>
                      <span className="text-xs font-semibold uppercase tracking-wider block mt-1">
                        Trust Score
                      </span>
                    </div>
                  </div>

                  {/* Deterministic Metrics Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-5 text-small">
                    <div className="p-3 rounded-xs bg-canvas border border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Completed Transfers
                      </div>
                      <div className="text-h3 font-bold text-ink">{org.successfulTransfers}</div>
                    </div>

                    <div className="p-3 rounded-xs bg-canvas border border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                        <Clock size={13} className="text-amber-600" />
                        Transfer Delays
                      </div>
                      <div className={`text-h3 font-bold ${org.delayedTransfers > 0 ? "text-amber-600" : "text-ink"}`}>
                        {org.delayedTransfers}
                      </div>
                    </div>

                    <div className="p-3 rounded-xs bg-canvas border border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                        <Thermometer size={13} className="text-danger" />
                        Cold-Chain Breaches
                      </div>
                      <div className={`text-h3 font-bold ${org.coldChainViolations > 0 ? "text-danger" : "text-ink"}`}>
                        {org.coldChainViolations}
                      </div>
                    </div>

                    <div className="p-3 rounded-xs bg-canvas border border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                        <AlertTriangle size={13} className="text-danger" />
                        Batches Recalled
                      </div>
                      <div className={`text-h3 font-bold ${org.recallsCount > 0 ? "text-danger" : "text-ink"}`}>
                        {org.recallsCount}
                      </div>
                    </div>

                    <div className="p-3 rounded-xs bg-canvas border border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                        <XCircle size={13} className="text-danger" />
                        Verification Fails
                      </div>
                      <div className={`text-h3 font-bold ${org.verificationFailures > 0 ? "text-danger" : "text-ink"}`}>
                        {org.verificationFailures}
                      </div>
                    </div>

                    <div className="p-3 rounded-xs bg-canvas border border-border">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                        <ShieldCheck size={13} className="text-primary" />
                        Chain Integrity
                      </div>
                      <div className="text-h3 font-bold text-primary">
                        {org.blockchainConsistency.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
