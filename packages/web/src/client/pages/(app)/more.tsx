import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Wallet,
  Activity,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
} from "lucide-react";

const MENU = [
  { label: "Spending", icon: Wallet, to: "/budget" },
  { label: "Activity", icon: Activity, to: "/activity" },
  { label: "Settings", icon: SettingsIcon, to: "/settings" },
];

export default function MorePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
        More
      </h2>

      {/* Account */}
      <div className="flex items-center gap-3 rounded-2xl border border-pixie-cream-200 bg-white p-4 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100">
        <div className="w-11 h-11 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center text-base font-semibold text-pixie-sage-600 dark:text-pixie-glow-sage shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
            {user?.name}
          </p>
          <p className="truncate text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="rounded-2xl border border-pixie-cream-200 bg-white overflow-hidden divide-y divide-pixie-cream-200 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 dark:divide-pixie-dusk-300">
        {MENU.map(({ label, icon: Icon, to }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-pixie-charcoal-200 hover:bg-pixie-cream-100 dark:text-pixie-mist-200 dark:hover:bg-pixie-dusk-200 transition-colors"
          >
            <Icon className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
          </button>
        ))}
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl border border-pixie-cream-200 bg-white text-red-600 hover:bg-red-50 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Sign out</span>
      </button>
    </div>
  );
}
