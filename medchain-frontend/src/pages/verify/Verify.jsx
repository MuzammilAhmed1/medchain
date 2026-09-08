import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { PageHeader, Card, CardHeader, Input, Button, Timeline, Badge, Alert } from "../../components/ui";
import { verifyApi } from "../../services/verifyApi";

export default function Verify() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null); // { found, authentic, batch }
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await verifyApi.verify(query.trim().toUpperCase());
      setResult(response);
      setChecked(true);
    } catch (err) {
      setError(err.message || "Could not verify this batch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Verify medicine"
        description="Enter a batch ID or scan its QR code to confirm authenticity."
      />
      <Card className="mb-6">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="e.g. MC-2026-00001"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="sm:w-auto" disabled={loading}>
            {loading ? "Checking…" : "Verify"}
          </Button>
        </form>
      </Card>

      {error && <Alert tone="danger" title="Verification failed">{error}</Alert>}

      {!checked && !error && (
        <Card>
          <p className="text-body text-ink-muted text-center py-8">
            Enter any batch ID created in MedChain to see its verification result.
          </p>
        </Card>
      )}

      {checked && result?.found && result.authentic && (
        <div className="flex flex-col gap-6">
          <Card className="border-success bg-success-tint">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-success shrink-0" size={28} />
              <div>
                <p className="text-h3 text-success-text">Authentic medicine</p>
                <p className="text-small text-success-text/80">Confirmed against blockchain records.</p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader
              title={result.batch.medicineName}
              subtitle={result.batch.id}
              action={<Badge status={result.batch.status} />}
            />
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-2">
              <div>
                <dt className="text-label text-ink-muted">Manufacturer</dt>
                <dd className="text-body text-ink">{result.batch.manufacturer}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-muted">Current owner</dt>
                <dd className="text-body text-ink">{result.batch.currentOwner}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-muted">Manufacturing date</dt>
                <dd className="text-body text-ink">{result.batch.manufacturingDate}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-muted">Expiry date</dt>
                <dd className="text-body text-ink">{result.batch.expiryDate}</dd>
              </div>
            </dl>
            <Link to={`/app/batches/${result.batch.id}`} className="text-small text-primary font-medium">
              View full batch details →
            </Link>
          </Card>
          <Card>
            <CardHeader title="Supply chain history" />
            <Timeline steps={result.batch.timeline} />
          </Card>
        </div>
      )}

      {checked && result?.found && !result.authentic && (
        <div className="flex flex-col gap-6">
          <Card className="border-danger bg-danger-tint">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-danger shrink-0" size={28} />
              <div>
                <p className="text-h3 text-danger-text">This batch has been recalled</p>
                <p className="text-small text-danger-text/80">
                  Do not distribute or dispense. Quarantine remaining stock immediately.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader
              title={result.batch.medicineName}
              subtitle={result.batch.id}
              action={<Badge status={result.batch.status} />}
            />
            <p className="text-body text-ink">{result.batch.riskReason}</p>
            <Link to={`/app/batches/${result.batch.id}`} className="text-small text-primary font-medium block mt-3">
              View full batch details →
            </Link>
          </Card>
        </div>
      )}

      {checked && result && !result.found && (
        <Card className="border-border">
          <div className="flex flex-col items-center text-center gap-2 py-10">
            <XCircle className="text-ink-faint" size={32} />
            <p className="text-h3 text-ink">We could not verify this batch</p>
            <p className="text-small text-ink-muted max-w-sm">
              "{query}" does not match any batch on record. Double-check the ID or QR code and try again.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
