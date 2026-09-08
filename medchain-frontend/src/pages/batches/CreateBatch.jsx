import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { PageHeader, Card, CardHeader, Input, Button, Alert } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { batchApi } from "../../services/batchApi";

export default function CreateBatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    medicineName: "",
    manufacturingDate: "",
    expiryDate: "",
    quantity: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError("");
    setSubmitting(true);

    try {
      const batch = await batchApi.create({
        medicineName: form.medicineName.trim(),
        manufacturingDate: form.manufacturingDate,
        expiryDate: form.expiryDate,
        quantity: Number(form.quantity),
      });
      setCreated(batch);
    } catch (err) {
      // The backend returns field-level messages like "quantity: must be at least 1"
      // in err.details - split those out so they land under the right input.
      if (err.details?.length) {
        const next = {};
        for (const detail of err.details) {
          const [field, ...rest] = detail.split(":");
          next[field.trim()] = rest.join(":").trim();
        }
        setFieldErrors(next);
      }
      setFormError(err.message || "Could not create the batch.");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Batch created" description="The batch is recorded and ready to transfer." />
        <Card className="mb-6">
          <Alert tone="success" title={`${created.id} created successfully`}>
            {created.blockchainEvents?.length > 0
              ? "A BATCH_CREATED event was written to the chain."
              : "Saved to MedChain. No blockchain event was recorded — the chain service may be offline."}
          </Alert>
        </Card>
        <Card>
          <CardHeader title="QR code" subtitle="Print or attach this to the physical packaging" />
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="p-4 border border-border rounded-md bg-white">
              <QRCode value={created.id} size={160} />
            </div>
            <p className="font-mono text-small text-ink-muted">{created.id}</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => window.print()}>
                Download QR
              </Button>
              <Button onClick={() => navigate(`/app/batches/${created.id}`)}>View batch details</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create medicine batch"
        description="Register a new batch and generate its QR code."
      />
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Medicine name"
            placeholder="e.g. Amoxicillin 500mg"
            value={form.medicineName}
            onChange={update("medicineName")}
            error={fieldErrors.medicineName}
          />
          <Input label="Manufacturer" value={user?.organization || ""} disabled />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Manufacturing date"
              type="date"
              value={form.manufacturingDate}
              onChange={update("manufacturingDate")}
              error={fieldErrors.manufacturingDate}
            />
            <Input
              label="Expiry date"
              type="date"
              value={form.expiryDate}
              onChange={update("expiryDate")}
              error={fieldErrors.expiryDate}
            />
          </div>
          <Input
            label="Quantity"
            type="number"
            min="1"
            placeholder="e.g. 5000"
            value={form.quantity}
            onChange={update("quantity")}
            error={fieldErrors.quantity}
          />
          {formError && !Object.keys(fieldErrors).length && <Alert tone="danger">{formError}</Alert>}
          <div className="flex gap-3 mt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording on chain…" : "Create batch"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/app/batches")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
