import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, EmptyState } from "../ui";

export default function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return (
      <Card>
        <EmptyState
          title="You do not have access to this page"
          description={`This section is only available to ${roles.join(", ").toLowerCase()} accounts.`}
        />
      </Card>
    );
  }
  return children;
}
