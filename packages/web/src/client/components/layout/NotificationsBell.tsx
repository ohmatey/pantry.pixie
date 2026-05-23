import { NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Header bell with an unread-count badge. Links to the notifications inbox.
 */
export function NotificationsBell() {
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.isRead).length;

  return (
    <NavLink
      to="/notifications"
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      className={({ isActive }) =>
        cn(
          "relative flex items-center justify-center w-9 h-9 rounded-full transition-colors",
          isActive
            ? "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage"
            : "text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200",
        )
      }
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </NavLink>
  );
}
