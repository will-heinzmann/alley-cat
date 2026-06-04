import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";

const iconFor = (type: string) => {
  if (type === "like") return "🙌";
  if (type === "comment") return "💬";
  if (type === "achievement") return "🏆";
  return "🔔";
};

const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAllRead, markRead, remove } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative text-xl px-1 hover:opacity-80"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto border border-border bg-card shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 sticky top-0 bg-card">
            <span className="text-sm text-primary font-bold">🔔 Notifications</span>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground p-4 text-center">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center italic">
              No notifications yet. Bowl a game or follow some friends! 🎳
            </p>
          ) : (
            <ul>
              {notifications.map((n) => {
                const inner = (
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">{iconFor(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(n.id);
                      }}
                      className="text-[10px] text-destructive hover:underline shrink-0"
                    >
                      [×]
                    </button>
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    className={`border-b border-border px-3 py-2 ${n.read ? "" : "bg-muted/40"}`}
                  >
                    {n.actor_id && n.type !== "achievement" ? (
                      <Link to={`/bowler/${n.actor_id}`} onClick={() => markRead(n.id)} className="block hover:opacity-80">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
