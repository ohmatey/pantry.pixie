import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { PixieAvatar } from "@/components/pixie/PixieAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPut, apiPost } from "@/lib/api";
import {
  X,
  Copy,
  Check,
  Mail,
  Loader2,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InvitedPerson {
  email: string;
  link: string;
  copied: boolean;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [step, setStep] = useState(0);
  const [pantryName, setPantryName] = useState(
    `${user?.name || "My"}'s Pantry`,
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedPeople, setInvitedPeople] = useState<InvitedPerson[]>([]);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [namePantryLoading, setNamePantryLoading] = useState(false);
  const [namePantryError, setNamePantryError] = useState("");
  const [finishLoading, setFinishLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const handleNamePantry = async () => {
    if (!pantryName.trim()) return;

    setNamePantryLoading(true);
    setNamePantryError("");

    try {
      if (token && user?.homeId) {
        await apiPut(`/api/homes/${user.homeId}`, token, {
          name: pantryName.trim(),
        });
      }
      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update pantry name";
      setNamePantryError(message);
      console.error("Name pantry error:", error);
    } finally {
      setNamePantryLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishLoading(true);
    try {
      localStorage.setItem("pp_onboarded", "true");
      // Small delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 300));
      navigate("/chat", { replace: true });
    } catch (error) {
      console.error("Finish error:", error);
      setFinishLoading(false);
    }
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !token || !user?.homeId) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Please enter a valid email");
      return;
    }

    // Check for duplicate
    if (invitedPeople.some((p) => p.email === email)) {
      setInviteError("Already invited");
      return;
    }

    setInviteSending(true);
    setInviteError("");

    try {
      const res = await apiPost<{ code: string; expiresAt: string }>(
        `/api/homes/${user.homeId}/invites`,
        token,
        {},
      );

      if (res.success && res.data) {
        const link = `${window.location.origin}/invite/${res.data.code}`;
        setInvitedPeople((prev) => [...prev, { email, link, copied: false }]);
        setInviteEmail("");
      }
    } catch {
      setInviteError("Failed to create invite");
    } finally {
      setInviteSending(false);
    }
  };

  const handleCopyInviteLink = async (email: string) => {
    const person = invitedPeople.find((p) => p.email === email);
    if (!person) return;
    await navigator.clipboard.writeText(person.link);
    setInvitedPeople((prev) =>
      prev.map((p) => (p.email === email ? { ...p, copied: true } : p)),
    );
    setTimeout(() => {
      setInvitedPeople((prev) =>
        prev.map((p) => (p.email === email ? { ...p, copied: false } : p)),
      );
    }, 2000);
  };

  const handleRemoveInvite = (email: string) => {
    setInvitedPeople((prev) => prev.filter((p) => p.email !== email));
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(0);
  const [, setPreviousStep] = useState(0);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleStepChange = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setPreviousStep(step);
    setStep(newStep);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      <div className="w-full max-w-sm space-y-8 text-center">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 0: Meet Pixie */}
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <PixieAvatar size="lg" animate />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
                  Hey! I'm Pixie, your pantry sidekick ✨
                </h2>
                <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300 leading-relaxed">
                  Think of me as your pantry's quiet organizer. No judgment, no
                  pressure — just a calm space to keep track of what you need.
                </p>
              </div>
              <Button onClick={() => handleStepChange(1)} className="w-full">
                Let's get started
              </Button>

              {/* Progress dots */}
              <div className="flex gap-2 justify-center pt-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      i === step
                        ? "bg-pixie-sage-500 w-6"
                        : "bg-pixie-sage-200 dark:bg-pixie-sage-400/30",
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Name Your Pantry */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <PixieAvatar size="md" />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
                  Let's set up your pantry
                </h2>
                <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                  What should we call it?
                </p>
                <motion.div
                  whileFocus={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Input
                    value={pantryName}
                    onChange={(e) => setPantryName(e.target.value)}
                    className="text-center"
                    placeholder="Smith Family Pantry"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pantryName.trim()) {
                        handleNamePantry();
                      }
                    }}
                  />
                </motion.div>
                <p className="text-xs text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60">
                  e.g., "Smith Family", "Apartment 4B", "Main Pantry"
                </p>
              </div>
              <div className="space-y-2">
                {namePantryError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{namePantryError}</span>
                  </motion.div>
                )}
                {isOffline && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-400"
                    role="alert"
                  >
                    <WifiOff className="w-4 h-4 flex-shrink-0" />
                    <span>
                      You're offline. Changes will sync when you reconnect.
                    </span>
                  </motion.div>
                )}
                <Button
                  onClick={handleNamePantry}
                  className="w-full"
                  disabled={!pantryName.trim() || namePantryLoading}
                >
                  {namePantryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex gap-2 justify-center pt-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      i === step
                        ? "bg-pixie-sage-500 w-6"
                        : "bg-pixie-sage-200 dark:bg-pixie-sage-400/30",
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Invite partner (optional) */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <PixieAvatar size="md" />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
                  Want to invite your household?
                </h2>
                <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300 leading-relaxed">
                  Share your pantry so everyone's on the same page. Add people
                  by email — they'll get a link to join.
                </p>
              </div>

              {/* Email input */}
              <div className="space-y-2">
                {inviteError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{inviteError}</span>
                  </motion.div>
                )}
                {isOffline && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-400"
                    role="alert"
                  >
                    <WifiOff className="w-4 h-4 flex-shrink-0" />
                    <span>
                      You're offline. Invites will be sent when you reconnect.
                    </span>
                  </motion.div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="partner@email.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setInviteError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendInvite();
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={handleSendInvite}
                    disabled={inviteSending || !inviteEmail.trim()}
                    size="sm"
                    className="shrink-0 px-4"
                  >
                    {inviteSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Invited people list */}
              {invitedPeople.length > 0 && (
                <div className="space-y-2">
                  {invitedPeople.map((person) => (
                    <div
                      key={person.email}
                      className="flex items-center gap-2 bg-pixie-sage-50/60 dark:bg-pixie-dusk-200/40 rounded-xl px-3 py-2.5 animate-in slide-in-from-top-2 fade-in duration-300"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-pixie-sage-200 dark:bg-pixie-sage-400/20 shrink-0">
                        <Check className="w-3.5 h-3.5 text-pixie-sage-600 dark:text-pixie-glow-sage" />
                      </div>
                      <span className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200 truncate flex-1 text-left">
                        {person.email}
                      </span>
                      <button
                        onClick={() => handleCopyInviteLink(person.email)}
                        className="shrink-0 p-1 hover:bg-pixie-sage-100 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                        title="Copy invite link"
                      >
                        {person.copied ? (
                          <Check className="w-3.5 h-3.5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveInvite(person.email)}
                        className="shrink-0 p-1 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60 text-left">
                    Invite links expire in 24 hours
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <Button onClick={() => handleStepChange(3)} className="w-full">
                  {invitedPeople.length > 0 ? "Continue" : "Skip for now"}
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex gap-2 justify-center pt-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      i === step
                        ? "bg-pixie-sage-500 w-6"
                        : "bg-pixie-sage-200 dark:bg-pixie-sage-400/30",
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Launch */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <PixieAvatar size="lg" animate />
              </div>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
                  You're all set! 🎉
                </h2>
                <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300 leading-relaxed">
                  Head to chat and tell me what's in your pantry — or what you
                  need to buy. I'm here whenever you're ready.
                </p>
              </div>
              <Button
                onClick={handleFinish}
                className="w-full"
                disabled={finishLoading}
              >
                {finishLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start chatting"
                )}
              </Button>

              {/* Progress dots */}
              <div className="flex gap-2 justify-center pt-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      i === step
                        ? "bg-pixie-sage-500 w-6"
                        : "bg-pixie-sage-200 dark:bg-pixie-sage-400/30",
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
