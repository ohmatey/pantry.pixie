import { Navigate } from "react-router-dom";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const onboarded = localStorage.getItem("pp_onboarded");

  if (!onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
