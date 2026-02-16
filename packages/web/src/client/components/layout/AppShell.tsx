import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Sparkles, User, Home, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventorySync } from "@/hooks/useInventorySync";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";

export function AppShell() {
  // Global WS→cache bridge for inventory updates
  useInventorySync();

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* App bar */}
      <header className="flex items-center justify-between h-14 border-b bg-white px-4 shrink-0 dark:bg-pixie-dusk-100 dark:border-pixie-dusk-300">
        {/* Logo */}
        <NavLink to="/chat" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage" />
          </div>
          <span className="text-lg font-semibold text-pixie-sage-600 font-display dark:text-pixie-glow-sage">
            Pixie
          </span>
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
                  : "text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200",
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
                  : "text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200",
              )
            }
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </NavLink>

          {/* User profile dropdown */}
          <DropdownMenu
            trigger={
              <div className="w-8 h-8 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center text-sm font-semibold text-pixie-sage-600 dark:text-pixie-glow-sage cursor-pointer hover:bg-pixie-sage-200 dark:hover:bg-pixie-dusk-300 transition-colors">
                {initials}
              </div>
            }
          >
            {/* User info header */}
            <div className="px-3 py-2.5 border-b border-pixie-cream-200 dark:border-pixie-dusk-300">
              <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 truncate">
                {user?.email}
              </p>
            </div>

            <DropdownItem onClick={() => navigate("/settings")}>
              <User className="w-4 h-4" />
              Profile
            </DropdownItem>
            <DropdownItem onClick={() => navigate("/settings")}>
              <Home className="w-4 h-4" />
              My Pantries
            </DropdownItem>

            <DropdownSeparator />

            <DropdownItem onClick={handleLogout} destructive>
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownItem>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
