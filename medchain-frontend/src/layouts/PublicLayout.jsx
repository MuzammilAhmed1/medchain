import { Outlet } from "react-router-dom";
import TopNav from "../components/nav/TopNav";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface py-8 px-6 md:px-10 text-small text-ink-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} MedChain</span>
          <span>Traceability MVP</span>
        </div>
      </footer>
    </div>
  );
}
