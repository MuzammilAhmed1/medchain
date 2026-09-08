import { Link } from "react-router-dom";
import { PageHeader, Card, Badge, Alert, LoadingBlock, EmptyState } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { batchApi } from "../../services/batchApi";

const barColor = { LOW: "bg-success", MEDIUM: "bg-warning", HIGH: "bg-danger" };

export default function Insights() {
  const { loading, error, data: batches } = useAsync(() => batchApi.list(), []);

  if (loading) return <LoadingBlock label="Loading risk analysis…" />;
  if (error) return <Alert tone="danger" title="Could not load insights">{error}</Alert>;

  const scored = batches.filter((b) => b.riskScore != null).sort((a, b) => b.riskScore - a.riskScore);
  const unscored = batches.filter((b) => b.riskScore == null);

  return (
    <div>
      <PageHeader
        title="AI insights"
        description="Each batch is scored from its transfer timing, ownership hops, and blockchain confirmations — not a black box, just a rule-based check run on every update."
      />

      {batches.length === 0 && <EmptyState title="No batches to analyze yet" />}

      <div className="flex flex-col gap-4">
        {scored.map((b) => (
          <Link key={b.id} to={`/app/batches/${b.id}`}>
            <Card className="hover:border-border-strong transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-h3 text-ink">{b.medicineName}</p>
                    <span className="font-mono text-small text-ink-muted">{b.id}</span>
                  </div>
                  <p className="text-small text-ink-muted">{b.riskReason}</p>
                </div>
                <div className="flex items-center gap-4 sm:w-64 shrink-0">
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor[b.riskLevel]}`}
                        style={{ width: `${b.riskScore}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-h3 text-ink w-10 text-right">{b.riskScore}</span>
                  <Badge status={b.riskLevel} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {unscored.length > 0 && (
        <div className="mt-6">
          <p className="text-label text-ink-muted mb-2">Not yet analyzed</p>
          <div className="flex flex-col gap-2">
            {unscored.map((b) => (
              <Link key={b.id} to={`/app/batches/${b.id}`}>
                <Card className="hover:border-border-strong transition-colors py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-body text-ink">{b.medicineName}</p>
                    <span className="font-mono text-small text-ink-muted">{b.id}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
