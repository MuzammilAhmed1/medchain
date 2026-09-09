import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Menu, Bell, Sparkles, Radio } from "lucide-react";
import Sidebar from "../components/nav/Sidebar";
import NotificationDrawer from "../components/notifications/NotificationDrawer";
import AssistantDrawer from "../components/assistant/AssistantDrawer";
import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../services/notificationApi";
import { useEventSource } from "../hooks/useEventSource";

export default function AppShell() {
  const { user, initializing } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initial unread notification count
  useEffect(() => {
    async function loadCount() {
      if (!user) return;
      try {
        const res = await notificationApi.getUnreadCount();
        setUnreadCount(res.unreadCount || 0);
      } catch (err) {
        console.error("Failed to load notification unread count:", err);
      }
    }
    loadCount();
  }, [user]);

  // Hook into live SSE events to update badge count instantly
  const { isConnected } = useEventSource({
    NOTIFICATION: () => {
      setUnreadCount((prev) => prev + 1);
    },
    COLD_CHAIN_ALERT: () => {
      setUnreadCount((prev) => prev + 1);
    },
    ANOMALY_DETECTED: () => {
      setUnreadCount((prev) => prev + 1);
    },
  });

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
        {/* Top Header for both mobile and desktop */}
        <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              className="text-ink-muted hover:text-ink md:hidden"
            >
              <Menu size={22} />
            </button>
            <span className="text-h3 text-ink font-bold md:hidden">MedChain</span>
            <div className="hidden md:flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-xs text-ink-muted">
                {isConnected ? "Real-Time Event Stream Connected" : "Connecting to stream..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={() => setAssistantDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-tint/80 border border-primary/25 rounded-xs text-xs font-semibold text-primary hover:bg-primary-tint transition-colors"
            >
              <Sparkles size={15} />
              <span>AI Assistant</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifDrawerOpen(true)}
              aria-label="View notifications"
              className="relative p-2 rounded-xs hover:bg-canvas text-ink-muted hover:text-ink transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <Outlet />
        </main>
      </div>

      {/* Notification Slide-Over Drawer */}
      <NotificationDrawer
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        onNotificationCountChange={setUnreadCount}
      />

      {/* AI Assistant Slide-Over Drawer */}
      <AssistantDrawer
        isOpen={assistantDrawerOpen}
        onClose={() => setAssistantDrawerOpen(false)}
      />
    </div>
  );
}
