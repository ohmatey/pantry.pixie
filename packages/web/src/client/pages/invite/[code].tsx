import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PixieAvatar } from "@/components/pixie/PixieAvatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { apiPost } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface InviteInfo {
  homeName: string;
  inviterName: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { token, user, setAuth } = useAuth();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;

    async function fetchInfo() {
      try {
        const res = await fetch(`/api/invites/${code}`);
        const data = await res.json();
        if (data.success) {
          setInviteInfo(data.data);
        } else {
          setError(data.error || "Invalid invite");
        }
      } catch {
        setError("Could not load invite info");
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [code]);

  // Not logged in? Redirect to register, preserving invite code
  if (!token) {
    // Store invite code so we can redirect back after registration
    localStorage.setItem("pp_pending_invite", code || "");
    navigate("/register", { replace: true });
    return null;
  }

  const handleAccept = async () => {
    if (!code || !token) return;
    setAccepting(true);
    setError("");

    try {
      const res = await apiPost<{ homeId: string; homeName: string }>(
        `/api/invites/${code}/accept`,
        token,
        {},
      );

      if (res.data) {
        // Update auth store with new homeId
        if (user) {
          setAuth(token, { ...user, homeId: res.data.homeId });
        }
        localStorage.setItem("pp_onboarded", "true");
        navigate("/chat", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-pixie-cream-50 dark:bg-pixie-dusk-50">
        <Loader2 className="w-6 h-6 animate-spin text-pixie-sage-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[100dvh] p-4 bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <PixieAvatar size="lg" animate />
          </div>
          <CardTitle>Join a Pantry</CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-3">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {inviteInfo ? (
            <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
              <span className="font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
                {inviteInfo.inviterName}
              </span>{" "}
              invited you to join{" "}
              <span className="font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
                {inviteInfo.homeName}
              </span>
            </p>
          ) : (
            <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
              This invite link is invalid or has expired.
            </p>
          )}
        </CardContent>

        {inviteInfo && (
          <CardFooter className="flex flex-col gap-3">
            <Button
              onClick={handleAccept}
              className="w-full"
              disabled={accepting}
            >
              {accepting ? "Joining..." : "Join Pantry"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/chat", { replace: true })}
              className="w-full"
            >
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
