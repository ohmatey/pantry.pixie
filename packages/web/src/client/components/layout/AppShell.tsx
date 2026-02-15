import { Outlet, NavLink } from "react-router-dom";
import { ShoppingCart, Plus, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventorySync } from "@/hooks/useInventorySync";

export function AppShell() {
  // Global WS→cache bridge for inventory updates
  useInventorySync();

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* App bar */}
      <header className="flex items-center justify-between h-14 border-b bg-white px-4 shrink-0 dark:bg-pixie-dusk-100 dark:border-pixie-dusk-300">
        {/* Logo */}
        <NavLink to="/chat" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage" />
          </div>
          <span className="text-lg font-semibold text-pixie-sage-600 font-display dark:text-pixie-glow-sage">Pixie</span>
        </NavLink>

        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/list"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isActive
                  ? "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage"
                  : "text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200"
              )
            }
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Lists</span>
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isActive
                  ? "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage"
                  : "text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200"
              )
            }
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                isActive
                  ? "bg-pixie-sage-100 text-pixie-sage-600 dark:bg-pixie-dusk-200 dark:text-pixie-glow-sage"
                  : "text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200"
              )
            }
          >
            <User className="w-4 h-4" />
          </NavLink>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
