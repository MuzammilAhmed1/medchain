import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, Input, Button, Alert } from "../../components/ui";

const DEMO_ACCOUNTS = [
  { role: "Manufacturer", email: "priya@abcpharma.com", password: "password123" },
  { role: "Distributor", email: "grace@medline.com", password: "password123" },
  { role: "Pharmacy", email: "elena@cornerhealth.com", password: "password123" },
  { role: "Admin", email: "admin@medchain.dev", password: "password123" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
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

  const handleFillDemo = (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
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
            placeholder="••••••••"
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
          <div className="flex items-center justify-between">
            <span className="text-label text-ink-muted">Quick fill demo accounts</span>
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="text-small text-primary hover:underline"
            >
              {showDemo ? "Hide" : "Show"}
            </button>
          </div>

          {showDemo && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleFillDemo(demo)}
                  className="text-left p-2.5 rounded-xs border border-border bg-surface-muted hover:bg-surface text-small text-ink transition-colors"
                >
                  <p className="font-medium text-ink">{demo.role}</p>
                  <p className="text-xs text-ink-muted truncate">{demo.email}</p>
                </button>
              ))}
            </div>
          )}
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
