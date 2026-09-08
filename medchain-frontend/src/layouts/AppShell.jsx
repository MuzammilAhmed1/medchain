import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/nav/Sidebar";
import { useAuth } from "../context/AuthContext";

export default function AppShell() {
  const { user, initializing } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas">
        <p className="text-body text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="h-screen flex bg-canvas">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-y-0 left-0" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface flex items-center gap-3 px-4 md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="text-ink-muted hover:text-ink"
          >
            <Menu size={22} />
          </button>
          <span className="text-h3 text-ink font-bold">MedChain</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
