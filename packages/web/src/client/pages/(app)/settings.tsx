import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InviteCard } from "@/components/settings/InviteCard";
import { MemberList } from "@/components/settings/MemberList";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Home,
  LogOut,
  Pencil,
  Check,
  User,
  AlertTriangle,
  Download,
  Share,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [homeName, setHomeName] = useState("");
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const { data: home } = useQuery({
    queryKey: ["home", user?.homeId],
    queryFn: async () => {
      const res = await apiGet<any>(`/api/homes/${user!.homeId}`, token!);
      if (res.data) setHomeName(res.data.name);
      return res.data;
    },
    enabled: !!token && !!user?.homeId,
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSaveName = async () => {
    if (!token || !user?.homeId || !homeName.trim()) return;
    await apiPut(`/api/homes/${user.homeId}`, token, { name: homeName.trim() });
    setEditingName(false);
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
        Settings
      </h2>

      {/* Your Pantry */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
            <CardTitle className="text-lg">Pantry Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-2 block">
              Pantry Name
            </label>
            <div className="flex items-center gap-2">
              {editingName ? (
                <>
                  <Input
                    value={homeName}
                    onChange={(e) => setHomeName(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-2 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 flex-1">
                    {home?.name || homeName || "Loading..."}
                  </span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-2 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
                  </button>
                </>
              )}
            </div>
          </div>

          <MemberList />
        </CardContent>
      </Card>

      {/* Invite */}
      <InviteCard />

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
            <CardTitle className="text-lg">Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200">
            {user?.name}
          </p>
          <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
            {user?.email}
          </p>
        </CardContent>
      </Card>

      {/* PWA Install */}
      {!isInstalled && (isInstallable || isIOS) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
              <CardTitle className="text-lg">Install App</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200">
              Install Pantry Pixie for quick access and offline support.
            </p>

            {isIOS ? (
              <div className="space-y-2">
                <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                  To install on iOS:
                </p>
                <ol className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 space-y-1 ml-4 list-decimal">
                  <li className="flex items-center gap-1">
                    Tap the <Share className="w-3 h-3 inline" /> Share button
                    below
                  </li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            ) : (
              <Button
                onClick={promptInstall}
                className="w-full bg-pixie-sage-500 hover:bg-pixie-sage-600 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isInstalled && (
        <Card className="border-green-200 dark:border-green-900/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-lg text-green-700 dark:text-green-400">
                App Installed
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600 dark:text-green-300">
              Pantry Pixie is installed on your device. You can access it from
              your home screen.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <CardTitle className="text-lg text-red-700 dark:text-red-400">
              Danger Zone
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
