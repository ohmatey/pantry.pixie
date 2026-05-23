import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPut, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InviteCard } from "@/components/settings/InviteCard";
import { MemberList } from "@/components/settings/MemberList";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";
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
  Sparkles,
} from "lucide-react";

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const BUDGET_LEVELS = [
  { value: "low", label: "Budget-conscious" },
  { value: "medium", label: "Balanced" },
  { value: "high", label: "Premium" },
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Dairy-free",
  "Nut-free", "Halal", "Kosher", "Low-carb", "Keto",
];

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justJoined = searchParams.get("joined") === "1";
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [homeName, setHomeName] = useState("");
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const { data: home } = useQuery({
    queryKey: ["home", user?.homeId],
    queryFn: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiGet<any>(`/api/homes/${user!.homeId}`, token!);
      if (res.data) setHomeName(res.data.name);
      return res.data;
    },
    enabled: !!token && !!user?.homeId,
  });

  const { data: prefsData } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: () =>
      apiGet<{ dietaryRestrictions: string[]; cookingSkillLevel: string | null; budgetConsciousness: string | null; householdSize: number | null; sharedDietaryRestrictions: string[] }>(
        `/api/users/me/preferences?homeId=${user!.homeId}`,
        token!,
      ),
    enabled: !!token && !!user?.homeId,
  });

  const prefs = prefsData?.data;

  const updatePref = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      apiPatch("/api/users/me/preferences", token!, {
        ...updates,
        homeId: user?.homeId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Failed to save preferences"),
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

      {justJoined && (
        <div className="rounded-2xl border border-pixie-sage-200 bg-pixie-sage-50 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
              Welcome to {home?.name || "your shared pantry"}!
            </p>
            <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-0.5">
              Set your cooking and dietary preferences below so Pixie can help
              both of you — not just whoever set things up.
            </p>
          </div>
        </div>
      )}

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

      {/* Pixie Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
            <CardTitle className="text-lg">Pixie Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Cooking skill */}
          <div>
            <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-2 block">
              Cooking Skill
            </label>
            <div className="flex gap-2 flex-wrap">
              {SKILL_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => updatePref.mutate({ cookingSkillLevel: lvl.value })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    prefs?.cookingSkillLevel === lvl.value
                      ? "bg-pixie-sage-500 text-white border-pixie-sage-500"
                      : "border-pixie-cream-200 dark:border-pixie-dusk-300 text-pixie-charcoal-200 dark:text-pixie-mist-200 hover:border-pixie-sage-300"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget consciousness */}
          <div>
            <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-2 block">
              Budget Style
            </label>
            <div className="flex gap-2 flex-wrap">
              {BUDGET_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => updatePref.mutate({ budgetConsciousness: lvl.value })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    prefs?.budgetConsciousness === lvl.value
                      ? "bg-pixie-sage-500 text-white border-pixie-sage-500"
                      : "border-pixie-cream-200 dark:border-pixie-dusk-300 text-pixie-charcoal-200 dark:text-pixie-mist-200 hover:border-pixie-sage-300"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Household size */}
          <div>
            <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-2 block">
              Household Size
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const next = Math.max(1, (prefs?.householdSize ?? 1) - 1);
                  updatePref.mutate({ householdSize: next });
                }}
                className="w-8 h-8 rounded-full border border-pixie-cream-200 dark:border-pixie-dusk-300 flex items-center justify-center text-pixie-charcoal-200 dark:text-pixie-mist-200 hover:border-pixie-sage-300 transition-colors text-lg leading-none"
              >
                −
              </button>
              <span className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100 w-8 text-center">
                {prefs?.householdSize ?? 1}
              </span>
              <button
                onClick={() => {
                  const next = Math.min(20, (prefs?.householdSize ?? 1) + 1);
                  updatePref.mutate({ householdSize: next });
                }}
                className="w-8 h-8 rounded-full border border-pixie-cream-200 dark:border-pixie-dusk-300 flex items-center justify-center text-pixie-charcoal-200 dark:text-pixie-mist-200 hover:border-pixie-sage-300 transition-colors text-lg leading-none"
              >
                +
              </button>
              <span className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                {(prefs?.householdSize ?? 1) === 1 ? "person" : "people"}
              </span>
            </div>
          </div>

          {/* Dietary restrictions */}
          <div>
            <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-2 block">
              Dietary Restrictions
            </label>
            <div className="flex gap-2 flex-wrap">
              {DIETARY_OPTIONS.map((opt) => {
                const active = (prefs?.dietaryRestrictions ?? []).includes(opt);
                const toggle = () => {
                  const current = prefs?.dietaryRestrictions ?? [];
                  const updated = active
                    ? current.filter((x) => x !== opt)
                    : [...current, opt];
                  updatePref.mutate({ dietaryRestrictions: updated });
                };
                return (
                  <button
                    key={opt}
                    onClick={toggle}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      active
                        ? "bg-pixie-sage-500 text-white border-pixie-sage-500"
                        : "border-pixie-cream-200 dark:border-pixie-dusk-300 text-pixie-charcoal-200 dark:text-pixie-mist-200 hover:border-pixie-sage-300"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Household dietary rules (shared by both partners) */}
          <div>
            <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-1 block">
              Household Dietary Rules
            </label>
            <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mb-2">
              Shared by the whole home — Pixie respects these for everyone.
            </p>
            <div className="flex gap-2 flex-wrap">
              {DIETARY_OPTIONS.map((opt) => {
                const active = (prefs?.sharedDietaryRestrictions ?? []).includes(
                  opt,
                );
                const toggle = () => {
                  const current = prefs?.sharedDietaryRestrictions ?? [];
                  const updated = active
                    ? current.filter((x) => x !== opt)
                    : [...current, opt];
                  updatePref.mutate({ sharedDietaryRestrictions: updated });
                };
                return (
                  <button
                    key={opt}
                    onClick={toggle}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      active
                        ? "bg-pixie-sage-500 text-white border-pixie-sage-500"
                        : "border-pixie-cream-200 dark:border-pixie-dusk-300 text-pixie-charcoal-200 dark:text-pixie-mist-200 hover:border-pixie-sage-300"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

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
