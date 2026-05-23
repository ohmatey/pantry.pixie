import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Repeat,
  Clock,
  Users,
  CalendarCheck,
  CheckCheck,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useNotifications,
  useMarkNotificationRead,
  type NotificationItem,
} from "@/hooks/useNotifications";

const TYPE_META: Record<
  NotificationItem["type"],
  { icon: LucideIcon; tint: string }
> = {
  recurring_due: {
    icon: Repeat,
    tint: "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage",
  },
  expiring_soon: {
    icon: Clock,
    tint: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  running_low: {
    icon: TrendingDown,
    tint: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  partner_activity: {
    icon: Users,
    tint: "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage",
  },
  sunday_sync: {
    icon: CalendarCheck,
    tint: "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage",
  },
};

const LOADING_SPINNER = (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin w-6 h-6 border-2 border-pixie-sage-500 border-t-transparent rounded-full" />
  </div>
);

const NotificationRow = memo(function NotificationRow({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick: () => void;
}) {
  const meta = TYPE_META[notification.type] ?? {
    icon: Bell,
    tint: "bg-pixie-cream-200 text-pixie-charcoal-200 dark:bg-pixie-dusk-200 dark:text-pixie-mist-200",
  };
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-pixie-cream-100 dark:hover:bg-pixie-dusk-200 ${
        notification.isRead ? "" : "bg-pixie-sage-50/60 dark:bg-pixie-dusk-200/40"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.tint}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 leading-snug">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200 mt-0.5 leading-snug">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      {!notification.isRead && (
        <span className="w-2 h-2 rounded-full bg-pixie-sage-500 dark:bg-pixie-glow-sage shrink-0 mt-1.5" />
      )}
    </button>
  );
});

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.isRead);

  const handleClick = useCallback(
    (n: NotificationItem) => {
      if (!n.isRead) markRead.mutate(n.id);
      switch (n.type) {
        case "sunday_sync":
          if (n.refId) navigate(`/chat/${n.refId}`);
          break;
        case "partner_activity":
          navigate("/activity");
          break;
        case "recurring_due":
        case "running_low":
          navigate("/list");
          break;
        case "expiring_soon":
          navigate("/pantry");
          break;
      }
    },
    [markRead, navigate],
  );

  const handleMarkAll = useCallback(() => {
    for (const n of unread) markRead.mutate(n.id);
  }, [unread, markRead]);

  return (
    <div className="flex flex-col h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      {/* Header */}
      <div className="p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
          Notifications
        </h2>
        {unread.length > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 text-pixie-sage-600 dark:text-pixie-glow-sage hover:bg-pixie-sage-200 dark:hover:bg-pixie-dusk-300 transition-colors text-sm font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          LOADING_SPINNER
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
              <Bell className="w-8 h-8 text-pixie-sage-400 dark:text-pixie-glow-sage" />
            </div>
            <div>
              <p className="text-base font-medium text-pixie-charcoal-200 dark:text-pixie-mist-100 mb-1">
                You're all caught up
              </p>
              <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                Reminders, expiring items, and what your partner's up to will
                show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-pixie-cream-200 dark:divide-pixie-dusk-300">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onClick={() => handleClick(n)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
