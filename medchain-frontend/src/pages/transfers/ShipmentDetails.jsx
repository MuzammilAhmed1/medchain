import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Package,
  Radio,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Card, Badge, Button, Alert, LoadingBlock } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { transferApi } from "../../services/transferApi";
import { useEventSource } from "../../hooks/useEventSource";

function formatDate(val) {
  if (!val) return "—";
  try {
    return format(new Date(val), "MMM d, yyyy h:mm a");
  } catch {
    return val;
  }
}

export default function ShipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [shipment, setShipment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadShipmentData = async () => {
    try {
      setError("");
      const [shipmentRes, historyRes] = await Promise.all([
        transferApi.get(id),
        transferApi.historyOf(id).catch(() => []),
      ]);
      setShipment(shipmentRes);
      setHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (err) {
      setError(err.message || "Failed to load shipment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipmentData();
  }, [id]);

  // Real-time SSE listener
  useEventSource({
    TRANSFER_UPDATED: (data) => {
      if (data && (data.id === id || data.shipmentNumber === id || (shipment && data.id === shipment.id))) {
        loadShipmentData();
      }
    },
  });

  const handleStartShipment = async () => {
    if (!shipment) return;
    setActionLoading(true);
    setError("");
    setActionSuccess("");
    try {
      await transferApi.start(shipment.id);
      setActionSuccess("Shipment has been dispatched and is now IN TRANSIT.");
      await loadShipmentData();
    } catch (err) {
      setError(err.message || "Failed to start shipment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveShipment = async () => {
    if (!shipment) return;
    setActionLoading(true);
    setError("");
    setActionSuccess("");
    try {
      await transferApi.receive(shipment.id);
      setActionSuccess("Shipment confirmed and marked as RECEIVED.");
      await loadShipmentData();
    } catch (err) {
      setError(err.message || "Failed to confirm receipt.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/transfers")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Transfers
        </Button>
        <LoadingBlock label="Loading shipment foundation details…" />
      </div>
    );
  }

  if (!shipment && error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/transfers")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Transfers
        </Button>
        <Alert tone="danger" title="Shipment Not Found">
          {error}
        </Alert>
      </div>
    );
  }

  const isOriginOrg = user?.organization && shipment?.from === user.organization;
  const isDestOrg = user?.organization && shipment?.to === user.organization;
  const canStart = isOriginOrg && shipment?.status === "INITIATED";
  const canReceive = isDestOrg && shipment?.status === "IN_TRANSIT";

  const steps = [
    {
      key: "INITIATED",
      label: "1. Initiated",
      desc: "Created & Scheduled",
      time: shipment?.initiatedAt,
      completed: !!shipment?.initiatedAt,
      active: shipment?.status === "INITIATED",
    },
    {
      key: "IN_TRANSIT",
      label: "2. In Transit",
      desc: "Dispatched on Road",
      time: shipment?.startedAt,
      completed: !!shipment?.startedAt,
      active: shipment?.status === "IN_TRANSIT",
    },
    {
      key: "RECEIVED",
      label: "3. Received",
      desc: "Delivered & Confirmed",
      time: shipment?.receivedAt,
      completed: !!shipment?.receivedAt,
      active: shipment?.status === "RECEIVED",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/app/transfers")}
            className="inline-flex items-center text-small text-ink-muted hover:text-ink mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Shipments
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink font-mono">
              {shipment.shipmentNumber || shipment.id}
            </h1>
            <Badge status={shipment.status} />
          </div>
          <p className="text-small text-ink-muted mt-1">
            Supply Chain Transportation Journey: <span className="font-medium text-ink">{shipment.from}</span> →{" "}
            <span className="font-medium text-ink">{shipment.to}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/app/transfers/${shipment.id}/tracking`}>
            <Button variant="outline" size="sm">
              <MapPin className="w-4 h-4 mr-1.5 text-primary" /> Live GPS & Route
            </Button>
          </Link>

          <Button variant="secondary" size="sm" onClick={loadShipmentData} disabled={actionLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${actionLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {canStart && (
            <Button variant="primary" size="sm" onClick={handleStartShipment} disabled={actionLoading}>
              <Truck className="w-4 h-4 mr-1.5" />
              {actionLoading ? "Dispatching…" : "Start Shipment (Dispatch)"}
            </Button>
          )}

          {canReceive && (
            <Button variant="primary" size="sm" onClick={handleReceiveShipment} disabled={actionLoading}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {actionLoading ? "Confirming…" : "Confirm Receipt"}
            </Button>
          )}
        </div>
      </div>

      {actionSuccess && <Alert tone="success">{actionSuccess}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      {/* 3-Stage Shipment Lifecycle Banner */}
      <Card className="p-6">
        <h2 className="text-label font-semibold text-ink uppercase tracking-wider mb-4">
          Shipment Progress (Phase 1 Transportation Lifecycle)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {steps.map((step) => (
            <div
              key={step.key}
              className={`p-4 rounded-md border transition-all ${
                step.active
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                  : step.completed
                  ? "border-border bg-surface-muted/50"
                  : "border-border/60 bg-surface opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-body text-ink">{step.label}</span>
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : step.active ? (
                  <Clock className="w-4 h-4 text-warning" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-border" />
                )}
              </div>
              <p className="text-small text-ink-muted">{step.desc}</p>
              <p className="text-xs text-ink-muted mt-2 font-mono">
                {step.completed ? formatDate(step.time) : step.active ? "In progress" : "Awaiting previous step"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Origin and Destination Journey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Origin Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <h3 className="text-body font-semibold text-ink">Origin Facility</h3>
                <span className="text-xs text-ink-muted">Sender & Custodian</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-muted text-ink font-medium">
              {shipment.from}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Physical Address</label>
              <p className="text-body text-ink mt-0.5 font-medium flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{shipment.originAddress || "Location not configured"}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-small">
              <div>
                <span className="text-xs text-ink-muted block">Latitude</span>
                <span className="font-mono font-medium text-ink">
                  {shipment.originLatitude != null ? shipment.originLatitude.toFixed(6) : "Location not configured"}
                </span>
              </div>
              <div>
                <span className="text-xs text-ink-muted block">Longitude</span>
                <span className="font-mono font-medium text-ink">
                  {shipment.originLongitude != null ? shipment.originLongitude.toFixed(6) : "Location not configured"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-small">
              <span className="text-xs text-ink-muted block">Dispatched / Started</span>
              <span className="text-ink">{formatDate(shipment.startedAt || shipment.initiatedAt)}</span>
            </div>
          </div>
        </Card>

        {/* Destination Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                B
              </div>
              <div>
                <h3 className="text-body font-semibold text-ink">Destination Facility</h3>
                <span className="text-xs text-ink-muted">Recipient & Final Delivery</span>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-muted text-ink font-medium">
              {shipment.to}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Physical Address</label>
              <p className="text-body text-ink mt-0.5 font-medium flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{shipment.destinationAddress || "Location not configured"}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-small">
              <div>
                <span className="text-xs text-ink-muted block">Latitude</span>
                <span className="font-mono font-medium text-ink">
                  {shipment.destinationLatitude != null ? shipment.destinationLatitude.toFixed(6) : "Location not configured"}
                </span>
              </div>
              <div>
                <span className="text-xs text-ink-muted block">Longitude</span>
                <span className="font-mono font-medium text-ink">
                  {shipment.destinationLongitude != null ? shipment.destinationLongitude.toFixed(6) : "Location not configured"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-small">
              <span className="text-xs text-ink-muted block">Expected / Received</span>
              <span className="text-ink">
                {shipment.receivedAt
                  ? formatDate(shipment.receivedAt)
                  : shipment.expectedDeliveryAt
                  ? formatDate(shipment.expectedDeliveryAt)
                  : "Pending dispatch"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Cargo and Transportation Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Batch Info */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-ink-muted mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Cargo Details</span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Medicine</span>
            <span className="text-body font-semibold text-ink">{shipment.medicineName}</span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Batch Identifier</span>
            <Link
              to={`/app/batches/${shipment.batchId}`}
              className="font-mono text-small text-primary hover:underline inline-flex items-center gap-1"
            >
              {shipment.batchId}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Tracking & Telemetry Device */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-ink-muted">
              <Radio className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Live Telemetry</span>
            </div>
            <Link
              to={`/app/transfers/${shipment.id}/tracking`}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Open Map <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Tracking Protocol</span>
            <span className="text-small font-medium text-ink">
              {shipment.trackingEnabled ? "Enabled (GPS + Routes Active)" : "Disabled"}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">IoT Device ID</span>
            <span className="text-small font-mono text-ink">
              {shipment.trackingDeviceId || "Standard Logistics Node"}
            </span>
          </div>
          <div className="pt-1 space-y-2">
            <Link to={`/app/transfers/${shipment.id}/tracking`}>
              <Button variant="secondary" size="sm" className="w-full text-xs">
                <MapPin className="w-3.5 h-3.5 mr-1 text-primary" /> View Real-Time GPS Tracking
              </Button>
            </Link>
            {shipment.status === "IN_TRANSIT" && (
              <Link to={`/driver/track/${shipment.shipmentNumber}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-50">
                  <Radio className="w-3.5 h-3.5 mr-1 text-emerald-600 animate-pulse" /> Driver Smartphone Tracker (PWA)
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Blockchain Proof */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-ink-muted mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Cryptographic Ledger</span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Integrity Status</span>
            <span className="text-small font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified On-Chain
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Smart Contract Ledger</span>
            <span className="text-small text-ink">MedicineTraceability.sol</span>
          </div>
        </Card>
      </div>

      {/* Chronological Audit & Custody Timeline */}
      <Card className="p-6">
        <h2 className="text-body font-semibold text-ink mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Chronological Custody & Audit Trail
        </h2>

        {history.length === 0 ? (
          <p className="text-small text-ink-muted italic">
            No specific custody audit events recorded yet for this batch.
          </p>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
            {history.map((item, index) => (
              <div key={index} className="relative flex items-start gap-4 pl-2">
                <div className="w-4 h-4 rounded-full bg-primary border-2 border-surface mt-1 z-10 shrink-0" />
                <div className="flex-1 bg-surface-muted/40 p-3 rounded-md border border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                    <span className="font-medium text-body text-ink">
                      {item.eventType?.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-mono text-ink-muted">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-small text-ink">{item.description}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Authorized by: <span className="font-medium text-ink">{item.performedBy}</span> ({item.organization})
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
