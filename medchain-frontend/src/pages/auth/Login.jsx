import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, Input, Button, Alert } from "../../components/ui";

const DEMO_ACCOUNTS = [
  "priya@abcpharma.com (Manufacturer)",
  "grace@medline.com (Distributor)",
  "elena@cornerhealth.com (Pharmacy)",
  "admin@medchain.dev (Admin)",
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.message || "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <h1 className="text-h2 text-ink mb-1">Log in</h1>
        <p className="text-body text-ink-muted mb-6">
          Sign in to your MedChain account.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" className="w-full mt-2" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-label text-ink-muted mb-2">Demo accounts (password: password123)</p>
          <ul className="text-small text-ink-muted space-y-1 font-mono">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc}>{acc}</li>
            ))}
          </ul>
        </div>
        <p className="text-small text-ink-muted mt-6 text-center">
          New here?{" "}
          <Link to="/register" className="text-primary font-medium">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
