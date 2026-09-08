import { useState } from "react";
import { format } from "date-fns";
import { PageHeader, Card, Tabs, Table, Tr, Td, Badge, EmptyState, Button, Input, Alert, LoadingBlock } from "../../components/ui";
import { useAuth, ROLES } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { transferApi } from "../../services/transferApi";
import { batchApi } from "../../services/batchApi";
import { organizationApi } from "../../services/organizationApi";

const tabs = ["Pending", "History", "Initiate transfer"];

const targetRoleBySender = {
  [ROLES.MANUFACTURER]: "DISTRIBUTOR",
  [ROLES.DISTRIBUTOR]: "PHARMACY",
};

const nextOwnerDescription = {
  [ROLES.MANUFACTURER]: "an authorized Distributor",
  [ROLES.DISTRIBUTOR]: "an authorized Pharmacy",
};

function formatDate(value) {
  try {
    return format(new Date(value), "MMM d, yyyy p");
  } catch {
    return value;
  }
}

export default function Transfers() {
  const { user } = useAuth();
  const [active, setActive] = useState(tabs[0]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [recipient, setRecipient] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { loading, error, data } = useAsync(
    () => Promise.all([
      transferApi.pending(),
      transferApi.history(),
      batchApi.list(),
      organizationApi.list(),
    ]),
    [refreshKey]
  );

  const [pending = [], history = [], allBatches = [], allOrganizations = []] = data || [];
  
  const myBatches = (allBatches || []).filter(
    (b) => b.currentOwner === user?.organization && b.status !== "RECALLED" && b.status !== "IN_TRANSIT"
  );

  const targetRole = targetRoleBySender[user?.role];
  const eligibleOrganizations = (allOrganizations || []).filter(
    (org) => !targetRole || org.type === targetRole
  );

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleInitiate = async (e) => {
    e.preventDefault();
    if (!selectedBatch || !recipient.trim()) return;
    setFormError("");
    setSubmitting(true);
    try {
      await transferApi.initiate({ batchId: selectedBatch, toOrganizationName: recipient.trim() });
      setSelectedBatch("");
      setRecipient("");
      refresh();
      setActive("Pending");
    } catch (err) {
      setFormError(err.message || "Could not initiate the transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async (transferId) => {
    setReceivingId(transferId);
    try {
      await transferApi.receive(transferId);
      refresh();
    } catch (err) {
      setFormError(err.message || "Could not confirm receipt.");
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Supply chain" description="Transfers in progress and completed handoffs." />
      <Card>
        <div className="mb-6">
          <Tabs items={tabs} active={active} onChange={setActive} />
        </div>

        {loading ? (
          <LoadingBlock label="Loading transfers…" />
        ) : error ? (
          <Alert tone="danger" title="Could not load transfers">{error}</Alert>
        ) : (
          <>
            {active === "Pending" &&
              (pending.length === 0 ? (
                <EmptyState title="No transfers pending" description="Nothing is waiting on your confirmation right now." />
              ) : (
                <Table columns={["Batch", "Medicine", "From", "To", "Initiated", ""]}>
                  {pending.map((t) => {
                    const canReceive = t.to === user?.organization;
                    return (
                      <Tr key={t.id}>
                        <Td mono>{t.batchId}</Td>
                        <Td>{t.medicineName}</Td>
                        <Td>{t.from}</Td>
                        <Td>{t.to}</Td>
                        <Td className="text-small text-ink-muted">{formatDate(t.initiatedAt)}</Td>
                        <Td>
                          {canReceive && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleReceive(t.id)}
                              disabled={receivingId === t.id}
                            >
                              {receivingId === t.id ? "Confirming…" : "Mark received"}
                            </Button>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Table>
              ))}

            {active === "History" &&
              (history.length === 0 ? (
                <EmptyState title="No completed transfers yet" />
              ) : (
                <Table columns={["Batch", "Medicine", "From", "To", "Status", "Received"]}>
                  {history.map((t) => (
                    <Tr key={t.id}>
                      <Td mono>{t.batchId}</Td>
                      <Td>{t.medicineName}</Td>
                      <Td>{t.from}</Td>
                      <Td>{t.to}</Td>
                      <Td><Badge status="RECEIVED" /></Td>
                      <Td className="text-small text-ink-muted">{t.receivedAt ? formatDate(t.receivedAt) : "—"}</Td>
                    </Tr>
                  ))}
                </Table>
              ))}

            {active === "Initiate transfer" &&
              (user?.role === ROLES.PHARMACY ? (
                <EmptyState
                  title="Pharmacies cannot initiate transfers"
                  description="As a Pharmacy, you represent the terminal dispensing point in the pharmaceutical supply chain. Batches in your custody are dispensed and verified directly for patients."
                />
              ) : myBatches.length === 0 ? (
                <EmptyState
                  title="Nothing available to transfer"
                  description="You have no batches currently in your custody that are ready to move on."
                />
              ) : (
                <form onSubmit={handleInitiate} className="flex flex-col gap-4 max-w-md">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-ink">Select Batch to Transfer</label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="h-10 rounded-xs border border-border px-3 text-body text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    >
                      <option value="">-- Choose a batch in your custody --</option>
                      {myBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.id} — {b.medicineName} ({b.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-ink">
                      Recipient Organization ({nextOwnerDescription[user?.role] || "Recipient"})
                    </label>
                    {eligibleOrganizations.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <select
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="h-10 rounded-xs border border-border px-3 text-body text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          required
                        >
                          <option value="">-- Select an eligible {targetRole?.toLowerCase() || "organization"} --</option>
                          {eligibleOrganizations.map((org) => (
                            <option key={org.id} value={org.name}>
                              {org.name} ({org.type})
                            </option>
                          ))}
                        </select>
                        <p className="text-small text-ink-muted">
                          Or type manually if registering in advance:
                        </p>
                        <Input
                          placeholder="Or type organization name manually"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                        />
                      </div>
                    ) : (
                      <Input
                        label="Recipient organization name"
                        placeholder={`Name of ${nextOwnerDescription[user?.role] || "receiving organization"}`}
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        required
                      />
                    )}
                  </div>

                  {formError && <Alert tone="danger">{formError}</Alert>}
                  <Button type="submit" className="mt-2" disabled={submitting}>
                    {submitting ? "Initiating transfer…" : "Initiate transfer"}
                  </Button>
                </form>
              ))}
          </>
        )}
      </Card>
    </div>
  );
}
