import { useAuth } from "../../context/AuthContext";
import { PageHeader, Card, CardHeader } from "../../components/ui";

export default function Profile() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Profile" description="Your account and organization details." />
      <Card>
        <CardHeader title="Account" />
        <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-body">
          <dt className="text-ink-muted">Name</dt>
          <dd className="text-ink">{user?.name}</dd>
          <dt className="text-ink-muted">Email</dt>
          <dd className="text-ink">{user?.email}</dd>
          <dt className="text-ink-muted">Organization</dt>
          <dd className="text-ink">{user?.organization}</dd>
          <dt className="text-ink-muted">Role</dt>
          <dd className="text-ink">{user?.role}</dd>
        </dl>
      </Card>
    </div>
  );
}
