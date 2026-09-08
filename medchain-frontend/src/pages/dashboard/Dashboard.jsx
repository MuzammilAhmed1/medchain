import { Link, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { PageHeader, Card, CardHeader, StatCard, Badge, Alert, Table, Tr, Td, LoadingBlock } from "../../components/ui";
import { dashboardApi } from "../../services/dashboardApi";
import { batchApi } from "../../services/batchApi";

const STATUS_ORDER = ["CREATED", "IN_TRANSIT", "RECEIVED", "VERIFIED", "RECALLED"];
const statusColor = {
  CREATED: "#9AA1AA",
  IN_TRANSIT: "#D97706",
  RECEIVED: "#2F6F63",
  VERIFIED: "#1E8E5A",
  RECALLED: "#C23B3B",
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { loading, error, data } = useAsync(
    () => Promise.all([dashboardApi.get(), batchApi.list()]),
    []
  );

  if (loading) return <LoadingBlock label="Loading dashboard…" />;
  if (error) return <Alert tone="danger" title="Could not load the dashboard">{error}</Alert>;

  const [{ stats, recentBatches, recentTransfers, riskAlerts }, allBatches] = data;

  const distribution = STATUS_ORDER.map((status) => ({
    status,
    count: allBatches.filter((b) => b.status === status).length,
  }));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        description="Here is what is moving through the supply chain right now."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total batches" value={stats.total} />
        <StatCard label="Verified" value={stats.verified} tone="success" />
        <StatCard label="In transit" value={stats.inTransit} tone="warning" />
        <StatCard label="Received" value={stats.received} />
        <StatCard label="High risk" value={stats.highRisk} tone="danger" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Batch status distribution" subtitle="Count of batches at each stage of the chain" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} barSize={40}>
                <CartesianGrid vertical={false} stroke="#DCE1E6" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 12, fill: "#5B6470" }}
                  tickFormatter={(v) => v.replace("_", " ")}
                  axisLine={{ stroke: "#DCE1E6" }}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5B6470" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#F6F7F8" }}
                  contentStyle={{ borderRadius: 8, borderColor: "#DCE1E6", fontSize: 13 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((entry) => (
                    <Cell key={entry.status} fill={statusColor[entry.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="AI risk alerts" subtitle="Batches needing attention" />
          <div className="flex flex-col gap-3">
            {riskAlerts.length === 0 && (
              <p className="text-small text-ink-muted">No elevated-risk batches right now.</p>
            )}
            {riskAlerts.map((b) => (
              <Link key={b.id} to={`/app/batches/${b.id}`}>
                <Alert tone={b.riskLevel === "HIGH" ? "danger" : "warning"} title={`${b.id} — Risk ${b.riskScore}/100`}>
                  {b.riskReason}
                </Alert>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Recent batches"
            action={
              <Link to="/app/batches" className="text-small text-primary font-medium">
                View all
              </Link>
            }
          />
          {recentBatches.length === 0 ? (
            <p className="text-small text-ink-muted py-6 text-center">No batches yet.</p>
          ) : (
            <Table columns={["Batch", "Medicine", "Status"]}>
              {recentBatches.map((b) => (
                <Tr key={b.id} onClick={() => navigate(`/app/batches/${b.id}`)}>
                  <Td mono>{b.id}</Td>
                  <Td>{b.medicineName}</Td>
                  <Td><Badge status={b.status} /></Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent transfers"
            action={
              <Link to="/app/transfers" className="text-small text-primary font-medium">
                View all
              </Link>
            }
          />
          {recentTransfers.length === 0 ? (
            <p className="text-small text-ink-muted py-6 text-center">No transfers yet.</p>
          ) : (
            <Table columns={["Batch", "From \u2192 To", "Status"]}>
              {recentTransfers.map((t) => (
                <Tr key={t.id}>
                  <Td mono>{t.batchId}</Td>
                  <Td className="text-small">{t.from} → {t.to}</Td>
                  <Td><Badge status={t.status === "INITIATED" ? "IN_TRANSIT" : "RECEIVED"} /></Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
