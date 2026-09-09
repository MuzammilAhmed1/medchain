import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  ArrowRight,
  Radio,
  Building2,
  Calendar,
  AlertCircle,
  Trash2,
  Navigation,
  Compass
} from "lucide-react";
import { PageHeader, Card, Tabs, Table, Tr, Td, Badge, EmptyState, Button, Input, Alert, LoadingBlock } from "../../components/ui";
import { useAuth, ROLES } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { transferApi } from "../../services/transferApi";
import { batchApi } from "../../services/batchApi";
import { organizationApi } from "../../services/organizationApi";
import { useEventSource } from "../../hooks/useEventSource";

const tabs = ["All Shipments", "Initiated", "In Transit", "Received", "New Shipment"];

const targetRoleBySender = {
  [ROLES.MANUFACTURER]: "DISTRIBUTOR",
  [ROLES.DISTRIBUTOR]: "PHARMACY",
};

const nextOwnerDescription = {
  [ROLES.MANUFACTURER]: "an authorized Distributor",
  [ROLES.DISTRIBUTOR]: "an authorized Pharmacy",
};

const CITY_PRESETS = [
  { name: "Raichur", address: "Plot 12, Industrial Area, Raichur, Karnataka 584102", lat: 16.2120, lng: 77.3439 },
  { name: "Bangalore", address: "Electronic City Phase 1, Hosur Road, Bangalore, Karnataka 560100", lat: 12.8452, lng: 77.6602 },
  { name: "Mysore", address: "Devaraja Mohalla, Sayyaji Rao Rd, Mysore, Karnataka 570001", lat: 12.3080, lng: 76.6534 },
  { name: "Bellary", address: "Cantonment Area, Bellary, Karnataka 583104", lat: 15.1394, lng: 76.9214 },
  { name: "Hyderabad", address: "Genome Valley, Shamirpet, Hyderabad, Telangana 500078", lat: 17.6040, lng: 78.6010 },
];

function formatDate(value) {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy p");
  } catch {
    return value;
  }
}

export default function Transfers() {
  const { user } = useAuth();
  const [active, setActive] = useState(tabs[0]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [trackingDeviceId, setTrackingDeviceId] = useState("");

  // Location inputs (typeable & customizable)
  const [originAddress, setOriginAddress] = useState("");
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");

  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { loading, error, data } = useAsync(
    () => Promise.all([
      transferApi.all(),
      batchApi.list(),
      organizationApi.list(),
      organizationApi.current().catch(() => null),
    ]),
    [refreshKey]
  );

  const [allTransfers = [], allBatches = [], allOrganizations = [], currentOrg = null] = data || [];

  const refresh = () => setRefreshKey((k) => k + 1);

  // Pre-populate default origin from current user's organization profile or Raichur preset
  useEffect(() => {
    if (!originAddress) {
      if (currentOrg) {
        const addr = currentOrg.formattedAddress || currentOrg.address || (currentOrg.city ? `${currentOrg.city}, ${currentOrg.state || "Karnataka"}` : "Plot 12, Industrial Area, Raichur, Karnataka 584102");
        setOriginAddress(addr);
        if (currentOrg.latitude != null) setOriginLat(String(currentOrg.latitude));
        else setOriginLat("16.2120");
        if (currentOrg.longitude != null) setOriginLng(String(currentOrg.longitude));
        else setOriginLng("77.3439");
      } else {
        setOriginAddress("Plot 12, Industrial Area, Raichur, Karnataka 584102");
        setOriginLat("16.2120");
        setOriginLng("77.3439");
      }
    }
  }, [currentOrg, originAddress]);

  // Real-time SSE updates
  useEventSource({
    TRANSFER_UPDATED: () => {
      refresh();
    },
  });

  const myBatches = (allBatches || []).filter(
    (b) => b.currentOwner === user?.organization && b.status !== "RECALLED" && b.status !== "IN_TRANSIT"
  );

  const targetRole = targetRoleBySender[user?.role];
  const eligibleOrganizations = (allOrganizations || []).filter(
    (org) => !targetRole || org.type === targetRole
  );

  const handleRecipientChange = (orgName) => {
    setRecipient(orgName);
    const found = (allOrganizations || []).find((o) => o.name === orgName);
    if (found) {
      const destAddr = found.formattedAddress || found.address || (found.city ? `${found.city}, ${found.state || "Karnataka"}` : "Electronic City Phase 1, Hosur Road, Bangalore, Karnataka 560100");
      setDestinationAddress(destAddr);
      if (found.latitude != null) setDestLat(String(found.latitude));
      else setDestLat("12.8452");
      if (found.longitude != null) setDestLng(String(found.longitude));
      else setDestLng("77.6602");
    }
  };

  const handleInitiate = async (e) => {
    e.preventDefault();
    if (!selectedBatchId || !recipient.trim()) return;
    setFormError("");
    setActionSuccess("");
    setSubmitting(true);
    try {
      const payload = {
        batchId: selectedBatchId,
        toOrganizationName: recipient.trim(),
        expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
        trackingEnabled: true,
        trackingDeviceId: trackingDeviceId.trim() || null,
        originAddress: originAddress.trim() || null,
        originLatitude: originLat ? parseFloat(originLat) : null,
        originLongitude: originLng ? parseFloat(originLng) : null,
        destinationAddress: destinationAddress.trim() || null,
        destinationLatitude: destLat ? parseFloat(destLat) : null,
        destinationLongitude: destLng ? parseFloat(destLng) : null,
      };
      const res = await transferApi.initiate(payload);
      setSelectedBatchId("");
      setRecipient("");
      setExpectedDeliveryAt("");
      setTrackingDeviceId("");
      setActionSuccess(`Shipment ${res.shipmentNumber || "created"} initiated successfully!`);
      refresh();
      setActive("All Shipments");
    } catch (err) {
      setFormError(err.message || "Could not initiate the shipment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (transferId) => {
    setActionLoadingId(transferId);
    setFormError("");
    setActionSuccess("");
    try {
      await transferApi.start(transferId);
      setActionSuccess("Shipment started and marked as IN TRANSIT.");
      refresh();
    } catch (err) {
      setFormError(err.message || "Could not start shipment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReceive = async (transferId) => {
    setActionLoadingId(transferId);
    setFormError("");
    setActionSuccess("");
    try {
      await transferApi.receive(transferId);
      setActionSuccess("Shipment confirmed and marked as RECEIVED.");
      refresh();
    } catch (err) {
      setFormError(err.message || "Could not confirm receipt.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm("Are you sure you want to remove all dummy/test shipments? Real batches will be reset to CREATED.")) {
      return;
    }
    setCleaning(true);
    setFormError("");
    setActionSuccess("");
    try {
      await transferApi.cleanup();
      setActionSuccess("Cleaned up dummy test shipments successfully.");
      refresh();
    } catch (err) {
      setFormError(err.message || "Could not clear test shipments.");
    } finally {
      setCleaning(false);
    }
  };

  // Filter transfers based on tab
  const filteredTransfers = (allTransfers || []).filter((t) => {
    if (active === "Initiated") return t.status === "INITIATED";
    if (active === "In Transit") return t.status === "IN_TRANSIT";
    if (active === "Received") return t.status === "RECEIVED";
    return true; // "All Shipments"
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Supply Chain Transportation"
          description="Real-data shipment workflows with origin and destination GPS tracking & Google Maps routing."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCleanup}
            disabled={cleaning}
            title="Clean up test shipments and reset batches to CREATED"
            className="text-ink-muted hover:text-danger hover:border-danger/40"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {cleaning ? "Cleaning…" : "Clear Test Shipments"}
          </Button>
          {user?.role !== ROLES.PHARMACY && active !== "New Shipment" && (
            <Button variant="primary" size="sm" onClick={() => setActive("New Shipment")}>
              <Plus className="w-4 h-4 mr-1.5" /> New Shipment
            </Button>
          )}
        </div>
      </div>

      {actionSuccess && <Alert tone="success">{actionSuccess}</Alert>}
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Card>
        <div className="mb-6">
          <Tabs items={tabs} active={active} onChange={setActive} />
        </div>

        {loading ? (
          <LoadingBlock label="Loading shipments…" />
        ) : error ? (
          <Alert tone="danger" title="Could not load shipments">{error}</Alert>
        ) : active === "New Shipment" ? (
          user?.role === ROLES.PHARMACY ? (
            <EmptyState
              title="Pharmacies cannot initiate transfers"
              description="As a Pharmacy, you represent the terminal dispensing point in the pharmaceutical supply chain. Batches in your custody are dispensed and verified directly for patients."
            />
          ) : myBatches.length === 0 ? (
            <EmptyState
              title="No batches available to transfer"
              description="You have no batches currently in your custody that are ready to transfer."
            />
          ) : (
            <form onSubmit={handleInitiate} className="max-w-2xl space-y-6">
              <div className="space-y-4">
                <h3 className="text-body font-semibold text-ink border-b border-border pb-2">
                  1. Select Cargo & Recipient
                </h3>

                {/* Batch Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-ink">Medicine Batch in Custody *</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="h-10 rounded-xs border border-border px-3 text-body text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  >
                    <option value="">-- Choose a batch in your custody --</option>
                    {myBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} — {b.medicineName} (Qty: {b.quantity}, Status: {b.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recipient Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-ink">
                    Destination Facility ({nextOwnerDescription[user?.role] || "Recipient"}) *
                  </label>
                  <select
                    value={recipient}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                    className="h-10 rounded-xs border border-border px-3 text-body text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  >
                    <option value="">-- Select verified {targetRole?.toLowerCase() || "organization"} --</option>
                    {eligibleOrganizations.map((org) => (
                      <option key={org.id} value={org.name}>
                        {org.name} ({org.type}) — {org.city ? `${org.city}, ${org.state}` : "Location configured"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editable Origin & Destination Route */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-body font-semibold text-ink flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    2. Origin & Destination Route (Editable)
                  </h3>
                  <span className="text-xs text-ink-muted">Type custom addresses or select quick presets</span>
                </div>

                {/* Origin Facility Details */}
                <div className="p-4 rounded-md bg-surface-muted/40 border border-border/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Origin Address (Pickup Point) *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-ink-muted font-medium mr-1">Presets:</span>
                      {CITY_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setOriginAddress(p.address);
                            setOriginLat(String(p.lat));
                            setOriginLng(String(p.lng));
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-surface border border-border/80 hover:bg-primary/10 hover:border-primary text-ink hover:text-primary transition"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    placeholder="e.g. Plot 12, Industrial Area, Raichur, Karnataka 584102"
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-ink-muted block mb-1">Origin Latitude</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 16.2120"
                        value={originLat}
                        onChange={(e) => setOriginLat(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-muted block mb-1">Origin Longitude</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 77.3439"
                        value={originLng}
                        onChange={(e) => setOriginLng(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Destination Facility Details */}
                <div className="p-4 rounded-md bg-surface-muted/40 border border-border/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-accent" />
                      Destination Address (Delivery Point) *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-ink-muted font-medium mr-1">Presets:</span>
                      {CITY_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setDestinationAddress(p.address);
                            setDestLat(String(p.lat));
                            setDestLng(String(p.lng));
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-surface border border-border/80 hover:bg-accent/10 hover:border-accent text-ink hover:text-accent transition"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    placeholder="e.g. Electronic City Phase 1, Hosur Road, Bangalore, Karnataka 560100"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-ink-muted block mb-1">Destination Latitude</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 12.8452"
                        value={destLat}
                        onChange={(e) => setDestLat(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-muted block mb-1">Destination Longitude</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 77.6602"
                        value={destLng}
                        onChange={(e) => setDestLng(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Route preview strip */}
                <div className="p-3 bg-surface rounded border border-border/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">Route Preview:</span>
                    <span className="text-primary font-medium">{originAddress ? originAddress.split(",")[0] : "Origin"}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
                    <span className="text-accent font-medium">{destinationAddress ? destinationAddress.split(",")[0] : "Destination"}</span>
                  </div>
                  <div className="text-[11px] font-mono text-ink-muted">
                    {originLat && originLng ? `${parseFloat(originLat).toFixed(2)}, ${parseFloat(originLng).toFixed(2)}` : "GPS Auto"} →{" "}
                    {destLat && destLng ? `${parseFloat(destLat).toFixed(2)}, ${parseFloat(destLng).toFixed(2)}` : "GPS Auto"}
                  </div>
                </div>
              </div>

              {/* Transportation Parameters */}
              <div className="space-y-4">
                <h3 className="text-body font-semibold text-ink border-b border-border pb-2">
                  3. Shipment Schedule & Telemetry
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-ink">Expected Delivery (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={expectedDeliveryAt}
                      onChange={(e) => setExpectedDeliveryAt(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-ink">IoT / Logistics Device ID (Optional)</label>
                    <Input
                      placeholder="e.g. DEV-TRUCK-01"
                      value={trackingDeviceId}
                      onChange={(e) => setTrackingDeviceId(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={submitting}>
                  <Truck className="w-4 h-4 mr-1.5" />
                  {submitting ? "Initiating shipment…" : "Create & Initiate Shipment"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setActive("All Shipments")}>
                  Cancel
                </Button>
              </div>
            </form>
          )
        ) : filteredTransfers.length === 0 ? (
          <EmptyState
            title={`No ${active.toLowerCase()} found`}
            description="Transfers will appear here once initiated or dispatched."
          />
        ) : (
          <Table columns={["Shipment #", "Medicine / Batch", "Origin", "Destination", "Status", "Dates", "Actions"]}>
            {filteredTransfers.map((t) => {
              const isOrigin = user?.organization && t.from === user.organization;
              const isDest = user?.organization && t.to === user.organization;
              const canStart = isOrigin && t.status === "INITIATED";
              const canReceive = isDest && t.status === "IN_TRANSIT";

              return (
                <Tr key={t.id}>
                  {/* Shipment Number */}
                  <Td>
                    <Link
                      to={`/app/transfers/${t.id}`}
                      className="font-mono text-small text-primary hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      {t.shipmentNumber || t.id.substring(0, 13)}
                      <ExternalLink className="w-3 h-3 text-ink-muted" />
                    </Link>
                  </Td>

                  {/* Cargo */}
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-ink">{t.medicineName}</span>
                      <span className="text-xs text-ink-muted font-mono">{t.batchId}</span>
                    </div>
                  </Td>

                  {/* Origin */}
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-ink">{t.from}</span>
                      <span className="text-xs text-ink-muted truncate max-w-[160px]" title={t.originAddress || "Not configured"}>
                        {t.originAddress || "Location not configured"}
                      </span>
                    </div>
                  </Td>

                  {/* Destination */}
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-ink">{t.to}</span>
                      <span className="text-xs text-ink-muted truncate max-w-[160px]" title={t.destinationAddress || "Not configured"}>
                        {t.destinationAddress || "Location not configured"}
                      </span>
                    </div>
                  </Td>

                  {/* Status Badge */}
                  <Td>
                    <Badge status={t.status} />
                  </Td>

                  {/* Dates */}
                  <Td className="text-xs text-ink-muted">
                    {t.status === "INITIATED" && <span>Init: {formatDate(t.initiatedAt)}</span>}
                    {t.status === "IN_TRANSIT" && <span>Started: {formatDate(t.startedAt || t.initiatedAt)}</span>}
                    {t.status === "RECEIVED" && <span>Recv: {formatDate(t.receivedAt)}</span>}
                  </Td>

                  {/* Context Actions */}
                  <Td>
                    <div className="flex items-center gap-2">
                      {canStart && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleStart(t.id)}
                          disabled={actionLoadingId === t.id}
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          {actionLoadingId === t.id ? "Starting…" : "Start"}
                        </Button>
                      )}

                      {canReceive && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleReceive(t.id)}
                          disabled={actionLoadingId === t.id}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {actionLoadingId === t.id ? "Receiving…" : "Receive"}
                        </Button>
                      )}

                      <Link to={`/app/transfers/${t.id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
