import { useEffect, useState } from "react";
import { X, Bell, Check, CheckCheck, AlertTriangle, ShieldAlert, Thermometer, ArrowRightLeft, Package } from "lucide-react";
import { notificationApi } from "../../services/notificationApi";

export default function NotificationDrawer({ isOpen, onClose, onNotificationCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL"); // ALL or UNREAD

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications(0, 50);
      const items = res.content || [];
      setNotifications(items);
      const unread = items.filter((n) => !n.isRead).length;
      if (onNotificationCountChange) onNotificationCountChange(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (onNotificationCountChange) {
        onNotificationCountChange((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onNotificationCountChange) onNotificationCountChange(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  if (!isOpen) return null;

  const filtered = notifications.filter((n) =>
    filter === "UNREAD" ? !n.isRead : true
  );

  const getIcon = (type) => {
    switch (type) {
      case "COLD_CHAIN_ALERT":
        return <Thermometer size={16} className="text-danger" />;
      case "FRAUD_ANOMALY":
      case "HIGH_RISK_BATCH":
        return <ShieldAlert size={16} className="text-danger" />;
      case "PREDICTED_SHORTAGE":
      case "EXPIRY_WARNING":
        return <AlertTriangle size={16} className="text-warning" />;
      case "TRANSFER_EVENT":
        return <ArrowRightLeft size={16} className="text-primary" />;
      default:
        return <Package size={16} className="text-ink-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              <h2 className="text-h3 font-semibold text-ink">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xs hover:bg-canvas text-ink-muted hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Controls */}
          <div className="px-5 py-3 bg-canvas border-b border-border flex items-center justify-between text-small">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-2.5 py-1 rounded-xs font-medium transition-colors ${
                  filter === "ALL"
                    ? "bg-surface text-primary border border-border shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("UNREAD")}
                className={`px-2.5 py-1 rounded-xs font-medium transition-colors ${
                  filter === "UNREAD"
                    ? "bg-surface text-primary border border-border shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Unread ({notifications.filter((n) => !n.isRead).length})
              </button>
            </div>
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                className="text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">Loading notifications...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-ink-muted">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium text-ink">No notifications</p>
                <p className="text-small mt-1">
                  {filter === "UNREAD" ? "You have read all messages." : "No activity recorded yet."}
                </p>
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${
                    n.isRead ? "bg-surface opacity-75" : "bg-primary-tint/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-xs bg-canvas border border-border shrink-0">
                      {getIcon(n.notificationType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-body font-medium text-ink truncate">{n.title}</p>
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            title="Mark read"
                            className="text-ink-muted hover:text-primary transition-colors p-0.5"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-small text-ink-muted mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
                        <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.referenceId && (
                          <span className="font-mono bg-canvas px-1.5 py-0.5 rounded-xs border border-border">
                            {n.referenceId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
