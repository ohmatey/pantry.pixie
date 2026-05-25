import { NavLink, useLocation } from "react-router-dom";
import { MessageSquare, Package, ShoppingCart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const tabBase =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors";
const tabActive = "text-pixie-sage-600 dark:text-pixie-glow-sage";
const tabIdle =
  "text-pixie-charcoal-200 hover:text-pixie-sage-600 dark:text-pixie-mist-300 dark:hover:text-pixie-glow-sage";

/**
 * Mobile-only bottom tab bar. Lives as a flex sibling of <main> so it never
 * overlaps content. The "More" tab opens a menu page housing Spending,
 * Activity and Settings.
 */
export function BottomNav() {
  const location = useLocation();
  const moreActive = ["/more", "/budget", "/activity", "/settings"].some((p) =>
    location.pathname.startsWith(p),
  );

  return (
    <nav
      aria-label="Primary"
      className="flex md:hidden shrink-0 border-t bg-white dark:bg-pixie-dusk-100 dark:border-pixie-dusk-300"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <NavLink
        to="/chats"
        className={({ isActive }) =>
          cn(
            tabBase,
            isActive || location.pathname.startsWith("/chat/")
              ? tabActive
              : tabIdle,
          )
        }
      >
        <MessageSquare className="w-5 h-5" />
        <span>Chats</span>
      </NavLink>
      <NavLink
        to="/pantry"
        className={({ isActive }) =>
          cn(tabBase, isActive ? tabActive : tabIdle)
        }
      >
        <Package className="w-5 h-5" />
        <span>Pantry</span>
      </NavLink>
      <NavLink
        to="/list"
        className={({ isActive }) =>
          cn(tabBase, isActive ? tabActive : tabIdle)
        }
      >
        <ShoppingCart className="w-5 h-5" />
        <span>Lists</span>
      </NavLink>
      <NavLink
        to="/more"
        className={cn(tabBase, moreActive ? tabActive : tabIdle)}
      >
        <Menu className="w-5 h-5" />
        <span>More</span>
      </NavLink>
    </nav>
  );
}
