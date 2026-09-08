import { Link, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ShieldCheck, Activity } from "lucide-react";
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

function formatTimestamp(value) {
  if (!value) return "";
  try {
    return format(new Date(value), "MMM d, h:mm a");
  } catch {
    return value;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { loading, error, data } = useAsync(
    () => Promise.all([dashboardApi.get(), batchApi.list()]),
    []
  );

  if (loading) return <LoadingBlock label="Loading dashboard…" />;
  if (error) return <Alert tone="danger" title="Could not load the dashboard">{error}</Alert>;

  const [dashboardData, allBatches = []] = data;
  const {
    stats = {},
    recentBatches = [],
    recentTransfers = [],
    riskAlerts = [],
    recentActivity = [],
  } = dashboardData || {};

  const distribution = STATUS_ORDER.map((status) => ({
    status,
    count: allBatches.filter((b) => b.status === status).length,
  }));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        description={`Organization: ${user?.organization || "N/A"} (${user?.role || "USER"})`}
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total batches" value={stats.total ?? 0} />
        <StatCard label="Active in chain" value={stats.active ?? 0} />
        <StatCard label="In transit" value={stats.inTransit ?? 0} tone="warning" />
        <StatCard label="Verified" value={stats.verified ?? 0} tone="success" />
        <StatCard label="Recalled" value={stats.recalled ?? 0} tone="danger" />
        <StatCard label="High AI risk" value={stats.highRisk ?? 0} tone={stats.highRisk > 0 ? "danger" : undefined} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Status distribution chart */}
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

        {/* AI risk alerts */}
        <Card>
          <CardHeader title="AI Risk Alerts" subtitle="Batches flagged for review" />
          <div className="flex flex-col gap-3">
            {riskAlerts.length === 0 && (
              <div className="py-8 text-center text-ink-muted">
                <ShieldCheck className="mx-auto mb-2 text-success" size={28} />
                <p className="text-small">All batches within normal risk thresholds.</p>
              </div>
            )}
            {riskAlerts.map((b) => (
              <Link key={b.id} to={`/app/batches/${b.id}`}>
                <Alert
                  tone={b.riskLevel === "HIGH" ? "danger" : "warning"}
                  title={`${b.id} — Score ${b.riskScore}/100`}
                >
                  <p className="text-small">{b.riskReason}</p>
                </Alert>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Live Recent Activity & Audit Trail */}
      {recentActivity && recentActivity.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Live Audit & Activity Log"
            subtitle="Immutable supply chain events recorded across the ecosystem"
          />
          <div className="divide-y divide-border overflow-hidden">
            {recentActivity.slice(0, 8).map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-full bg-surface-muted text-ink shrink-0">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-body font-medium text-ink">
                      {act.description}
                    </p>
                    <p className="text-small text-ink-muted">
                      Batch: <Link to={`/app/batches/${act.batchId}`} className="text-primary font-mono">{act.batchId}</Link> ({act.medicineName}) • by <span className="font-medium text-ink">{act.actorName}</span> ({act.actorOrg})
                    </p>
                  </div>
                </div>
                <span className="text-small text-ink-muted whitespace-nowrap shrink-0">
                  {formatTimestamp(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent batches */}
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

        {/* Recent transfers */}
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
            <Table columns={["Batch", "From → To", "Status"]}>
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
