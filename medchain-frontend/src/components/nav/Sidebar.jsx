import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  QrCode,
  Repeat,
  Sparkles,
  User,
  ShieldCheck,
  LogOut,
  Thermometer,
  ShieldAlert,
  TrendingUp,
  Award,
  Blocks,
} from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/batches", label: "Batches", icon: Package },
  { to: "/app/cold-chain", label: "Cold chain", icon: Thermometer },
  { to: "/app/anomalies", label: "Anomaly center", icon: ShieldAlert },
  { to: "/app/forecasts", label: "AI forecasts", icon: TrendingUp },
  { to: "/app/trust-scores", label: "Trust scores", icon: Award },
  { to: "/app/blockchain", label: "Blockchain", icon: Blocks },
  { to: "/app/transfers", label: "Supply chain", icon: Repeat },
  { to: "/app/verify", label: "Verify", icon: QrCode },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/admin", label: "Admin", icon: ShieldCheck, roles: [ROLES.ADMIN] },
];

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();

  const visible = items.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="text-h3 text-ink font-bold">MedChain</span>
      </div>

      <nav className="flex-1 py-4">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-body border-l-2 transition-colors ${
                isActive
                  ? "border-primary text-primary bg-primary-tint font-medium"
                  : "border-transparent text-ink-muted hover:text-ink hover:bg-canvas"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="px-2 mb-3">
          <p className="text-body text-ink font-medium truncate">{user?.name}</p>
          <p className="text-small text-ink-muted truncate">{user?.organization}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-2 py-1.5 text-small text-ink-muted hover:text-danger w-full rounded-xs"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
