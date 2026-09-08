import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Card, Table, Tr, Td, Badge, Button, Input, EmptyState, Alert, LoadingBlock } from "../../components/ui";
import { useAuth, ROLES } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { batchApi } from "../../services/batchApi";

const statusFilters = ["ALL", "CREATED", "IN_TRANSIT", "RECEIVED", "VERIFIED", "RECALLED"];

export default function BatchList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === ROLES.MANUFACTURER;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const { loading, error, data: allBatches } = useAsync(() => batchApi.list(), []);

  const batches = useMemo(() => {
    if (!allBatches) return [];
    return allBatches.filter((b) => {
      const matchesQuery =
        !query ||
        b.id.toLowerCase().includes(query.toLowerCase()) ||
        b.medicineName.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "ALL" || b.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [allBatches, query, status]);

  return (
    <div>
      <PageHeader
        title="Medicine batches"
        description="Every batch recorded in MedChain, with its current status."
        action={
          canCreate && <Button onClick={() => navigate("/app/batches/new")}>Create batch</Button>
        }
      />

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <Input
            placeholder="Search by batch ID or medicine name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-80"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xs border border-border px-3 text-body text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingBlock label="Loading batches…" />
        ) : error ? (
          <Alert tone="danger" title="Could not load batches">{error}</Alert>
        ) : batches.length === 0 ? (
          <EmptyState
            title={allBatches.length === 0 ? "No batches yet" : "No batches match your search"}
            description={
              allBatches.length === 0
                ? "Batches created by any manufacturer will show up here."
                : "Try a different batch ID, medicine name, or status filter."
            }
          />
        ) : (
          <Table columns={["Batch ID", "Medicine", "Current owner", "Quantity", "Status", "Risk"]}>
            {batches.map((b) => (
              <Tr key={b.id} onClick={() => navigate(`/app/batches/${b.id}`)}>
                <Td mono>{b.id}</Td>
                <Td>{b.medicineName}</Td>
                <Td>{b.currentOwner}</Td>
                <Td>{b.quantity.toLocaleString()}</Td>
                <Td><Badge status={b.status} /></Td>
                <Td>{b.riskLevel ? <Badge status={b.riskLevel} /> : <span className="text-small text-ink-muted">—</span>}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
