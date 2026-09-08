import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import QRCode from "react-qr-code";
import { PageHeader, Card, CardHeader, Badge, Timeline, Button, EmptyState, Alert, LoadingBlock } from "../../components/ui";
import { useAuth, ROLES } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { batchApi } from "../../services/batchApi";

const eventLabels = {
  BATCH_CREATED: "Batch created",
  TRANSFER_INITIATED: "Transfer initiated",
  TRANSFER_RECEIVED: "Transfer received",
  VERIFIED: "Verified",
  RECALLED: "Recalled",
};

function truncateHash(hash) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatDate(value) {
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export default function BatchDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [recalling, setRecalling] = useState(false);
  const [recallError, setRecallError] = useState("");

  const { loading, error, data: batch } = useAsync(() => batchApi.get(id), [id, refreshKey]);

  const handleRecall = async () => {
    if (!window.confirm(`Recall ${id}? This cannot be undone.`)) return;
    setRecalling(true);
    setRecallError("");
    try {
      await batchApi.recall(id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setRecallError(err.message || "Could not recall this batch.");
    } finally {
      setRecalling(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading batch…" />;

  if (error || !batch) {
    return (
      <Card>
        <EmptyState
          title="Batch not found"
          description={`No batch matches "${id}". It may have been mistyped or does not exist.`}
          action={
            <Link to="/app/batches">
              <Button variant="secondary">Back to batches</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const fields = [
    ["Medicine name", batch.medicineName],
    ["Batch number", batch.id],
    ["Manufacturer", batch.manufacturer],
    ["Manufacturing date", formatDate(batch.manufacturingDate)],
    ["Expiry date", formatDate(batch.expiryDate)],
    ["Quantity", batch.quantity.toLocaleString()],
    ["Current owner", batch.currentOwner],
  ];

  const canRecall =
    user?.role === ROLES.MANUFACTURER &&
    user?.organization === batch.manufacturer &&
    batch.status !== "RECALLED";

  return (
    <div>
      <PageHeader
        title={batch.medicineName}
        description={<span className="font-mono text-small text-ink-muted">{batch.id}</span>}
        action={
          <div className="flex items-center gap-2">
            <Badge status={batch.status} />
            {batch.riskLevel && <Badge status={batch.riskLevel} />}
            {canRecall && (
              <Button variant="danger" size="sm" onClick={handleRecall} disabled={recalling}>
                {recalling ? "Recalling…" : "Recall batch"}
              </Button>
            )}
          </div>
        }
      />

      {recallError && <Alert tone="danger" title="Recall failed">{recallError}</Alert>}

      <div className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader title="Medicine & batch information" />
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-label text-ink-muted">{label}</dt>
                  <dd className="text-body text-ink mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Supply chain timeline" subtitle="Chain of custody from creation to today" />
            <Timeline steps={batch.timeline} />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="QR code" />
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 border border-border rounded-md bg-white">
                <QRCode value={batch.id} size={140} />
              </div>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                Download QR
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="AI risk analysis" subtitle="Automated assessment of this batch" />
            {batch.riskScore == null ? (
              <p className="text-small text-ink-muted">
                Not yet analyzed — the AI risk service may be offline. It's re-checked on every
                update to this batch.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-h1 text-ink">{batch.riskScore}</span>
                  <span className="text-small text-ink-muted">/ 100</span>
                  <Badge status={batch.riskLevel} />
                </div>
                <p className="text-label text-ink-muted mb-1">Reason</p>
                <p className="text-body text-ink mb-4">{batch.riskReason}</p>
                <p className="text-label text-ink-muted mb-1">Recommendation</p>
                <p className="text-body text-ink">{batch.riskRecommendation}</p>
              </>
            )}
          </Card>

          <Card>
            <CardHeader title="Blockchain history" subtitle="Tamper-resistant event log" />
            {batch.blockchainEvents.length === 0 ? (
              <p className="text-small text-ink-muted">
                No on-chain events yet — the blockchain service may be offline or not yet
                configured with a deployed contract.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {batch.blockchainEvents.map((event, i) => (
                  <li key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <p className="text-body text-ink font-medium">{eventLabels[event.type] || event.type}</p>
                    <p className="text-small text-ink-muted mt-0.5">
                      Block {event.block.toLocaleString()} · {formatDate(event.timestamp)}
                    </p>
                    <p className="font-mono text-small text-ink-muted mt-1">{truncateHash(event.txHash)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
