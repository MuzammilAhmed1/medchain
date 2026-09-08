import { useState } from "react";
import { PageHeader, Card, Tabs, Table, Tr, Td, StatCard, Badge, Alert, LoadingBlock } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { adminApi } from "../../services/adminApi";

const tabs = ["System overview", "Users", "Organizations"];

export default function Admin() {
  const [active, setActive] = useState(tabs[0]);

  const { loading, error, data } = useAsync(
    () => Promise.all([adminApi.overview(), adminApi.users(), adminApi.organizations()]),
    []
  );

  return (
    <div>
      <PageHeader title="Admin" description="Users, organizations, and system overview." />
      <Card>
        <div className="mb-6">
          <Tabs items={tabs} active={active} onChange={setActive} />
        </div>

        {loading ? (
          <LoadingBlock label="Loading admin data…" />
        ) : error ? (
          <Alert tone="danger" title="Could not load admin data">{error}</Alert>
        ) : (
          (() => {
            const [overview, users, orgs] = data;
            return (
              <>
                {active === "System overview" && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total batches" value={overview.totalBatches} />
                    <StatCard label="Registered organizations" value={overview.totalOrganizations} />
                    <StatCard label="Registered users" value={overview.totalUsers} />
                    <StatCard
                      label="Recalled batches"
                      value={overview.recalledBatches}
                      tone={overview.recalledBatches > 0 ? "danger" : "default"}
                    />
                  </div>
                )}

                {active === "Users" && (
                  <Table columns={["Name", "Email", "Organization", "Role"]}>
                    {users.map((u) => (
                      <Tr key={u.id}>
                        <Td>{u.name}</Td>
                        <Td className="text-small text-ink-muted">{u.email}</Td>
                        <Td>{u.organization}</Td>
                        <Td><Badge tone="neutral">{u.role}</Badge></Td>
                      </Tr>
                    ))}
                  </Table>
                )}

                {active === "Organizations" && (
                  <Table columns={["Organization", "Type"]}>
                    {orgs.map((o) => (
                      <Tr key={o.id}>
                        <Td>{o.name}</Td>
                        <Td><Badge tone="neutral">{o.type}</Badge></Td>
                      </Tr>
                    ))}
                  </Table>
                )}
              </>
            );
          })()
        )}
      </Card>
    </div>
  );
}
