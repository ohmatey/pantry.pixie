import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy, Check, UserPlus } from "lucide-react";

export function InviteCard() {
  const { token, user } = useAuth();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!token || !user?.homeId) return;
    setLoading(true);

    try {
      const res = await apiPost<{ code: string; expiresAt: string }>(
        `/api/homes/${user.homeId}/invites`,
        token,
        {},
      );

      if (res.success && res.data) {
        const link = `${window.location.origin}/invite/${res.data.code}`;
        setInviteLink(link);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
          <CardTitle className="text-lg">Invite Members</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
          Share this link with your partner or housemate. They'll be able to see
          your items and chat with Pixie.
        </p>

        {!inviteLink ? (
          <Button
            onClick={handleGenerate}
            size="sm"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate invite link"}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-pixie-cream-100 dark:bg-pixie-dusk-200 rounded-xl px-3 py-2.5">
              <span className="text-xs text-pixie-charcoal-200 dark:text-pixie-mist-200 truncate flex-1 font-mono">
                {inviteLink}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                title={copied ? "Copied!" : "Copy link"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage" />
                ) : (
                  <Copy className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
                )}
              </button>
            </div>
            <p className="text-xs text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60">
              Link expires in 24 hours
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
