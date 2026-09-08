import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, ROLES } from "../../context/AuthContext";
import { Card, Input, Button, Alert } from "../../components/ui";

const roleOptions = [
  {
    value: ROLES.MANUFACTURER,
    label: "Manufacturer",
    description: "Produces and registers medicine batches, initiates transfers to distributors, and manages product recalls.",
  },
  {
    value: ROLES.DISTRIBUTOR,
    label: "Distributor",
    description: "Receives batches from manufacturers and securely transfers custody to authorized pharmacies.",
  },
  {
    value: ROLES.PHARMACY,
    label: "Pharmacy",
    description: "Receives batches from distributors, dispenses to patients, and performs QR authenticity verifications.",
  },
  {
    value: ROLES.ADMIN,
    label: "System Admin / Regulator",
    description: "Oversight role with comprehensive visibility across audits, transactions, and system health.",
  },
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [role, setRole] = useState(ROLES.MANUFACTURER);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        organizationName: organizationName.trim(),
        role: role,
        organizationType: role,
      });
      navigate("/app/dashboard");
    } catch (err) {
      if (err.details && err.details.length > 0) {
        setError(err.details.join(" • "));
      } else {
        setError(err.message || "Could not create your account.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <h1 className="text-h2 text-ink mb-1">Create an account</h1>
        <p className="text-body text-ink-muted mb-6">
          Register with your organization and supply-chain role to start tracking medicine batches.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full name"
            placeholder="e.g. Dr. Alex Morgan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Work email"
            type="email"
            placeholder="e.g. alex@pharma-solutions.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Organization name"
            placeholder="e.g. Apex BioTech, Metro Health, etc."
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-label text-ink">Supply Chain Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 rounded-xs border border-border px-3 text-body text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-small text-ink-muted">
              {roleOptions.find((o) => o.value === role)?.description}
            </p>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" className="w-full mt-2" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-small text-ink-muted mt-6 text-center">
          Already registered?{" "}
          <Link to="/login" className="text-primary font-medium">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
