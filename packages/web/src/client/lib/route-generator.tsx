/**
 * File-Based Route Generator
 *
 * Next.js-style file-based routing for React Router in SPA mode.
 *
 * Conventions:
 * - pages/login.tsx → /login
 * - pages/chat/index.tsx → /chat
 * - pages/invite/[code].tsx → /invite/:code
 * - pages/(auth)/... → route group (doesn't affect URL)
 * - pages/(auth)/_layout.tsx → layout wrapper for group
 * - pages/(auth)/_guard.tsx → guard wrapper for group
 */

import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Route, Navigate } from "react-router-dom";
import { ChatSkeleton } from "../components/skeletons/ChatSkeleton";
import { ListSkeleton } from "../components/skeletons/ListSkeleton";

// ============================================================================
// Types
// ============================================================================

export interface RouteConfig {
  path: string;
  element: ReactNode;
  children?: RouteConfig[];
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Define routes with lazy loading and wrappers
 */
export function generateRoutes() {
  // Lazy-loaded page components
  const LoginPage = lazy(() => import("../pages/login"));
  const RegisterPage = lazy(() => import("../pages/register"));
  const OnboardingPage = lazy(() => import("../pages/onboarding"));
  const AcceptInvitePage = lazy(() => import("../pages/invite/[code]"));
  const ChatsPage = lazy(() => import("../pages/(app)/chats"));
  const ChatPage = lazy(() => import("../pages/(app)/chat"));
  const PantryPage = lazy(() => import("../pages/(app)/pantry"));
  const ListPage = lazy(() => import("../pages/(app)/list"));
  const ActivityPage = lazy(() => import("../pages/(app)/activity"));
  const NotificationsPage = lazy(() => import("../pages/(app)/notifications"));
  const SettingsPage = lazy(() => import("../pages/(app)/settings"));
  const BudgetPage = lazy(() => import("../pages/(app)/budget"));
  const MorePage = lazy(() => import("../pages/(app)/more"));

  // Guards
  const AuthGuard = lazy(() =>
    import("../components/layout/AuthGuard").then((m) => ({
      default: m.AuthGuard,
    })),
  );
  const OnboardingGuard = lazy(() =>
    import("../components/layout/OnboardingGuard").then((m) => ({
      default: m.OnboardingGuard,
    })),
  );
  const AppShell = lazy(() =>
    import("../components/layout/AppShell").then((m) => ({
      default: m.AppShell,
    })),
  );

  // Fallback components for Suspense
  const DefaultFallback = () => (
    <div className="flex items-center justify-center h-screen bg-pixie-cream-100">
      <div className="animate-spin text-pixie-sage-500">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  );

  const withSuspense = (
    Component: ComponentType,
    fallback: ReactNode = <DefaultFallback />,
  ) => (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );

  const routes: RouteConfig[] = [
    {
      path: "/login",
      element: withSuspense(LoginPage),
    },
    {
      path: "/register",
      element: withSuspense(RegisterPage),
    },
    {
      path: "/onboarding",
      element: (
        <Suspense fallback={<DefaultFallback />}>
          <AuthGuard>
            <OnboardingPage />
          </AuthGuard>
        </Suspense>
      ),
    },
    {
      path: "/invite/:code",
      element: withSuspense(AcceptInvitePage),
    },
    {
      path: "/",
      element: (
        <Suspense fallback={<DefaultFallback />}>
          <AuthGuard>
            <OnboardingGuard>
              <AppShell />
            </OnboardingGuard>
          </AuthGuard>
        </Suspense>
      ),
      children: [
        {
          path: "chats",
          element: withSuspense(ChatsPage, <ChatSkeleton />),
        },
        {
          path: "chat/:threadId",
          element: withSuspense(ChatPage, <ChatSkeleton />),
        },
        {
          path: "pantry",
          element: withSuspense(PantryPage),
        },
        {
          path: "list",
          element: withSuspense(ListPage, <ListSkeleton />),
        },
        {
          path: "activity",
          element: withSuspense(ActivityPage),
        },
        {
          path: "notifications",
          element: withSuspense(NotificationsPage),
        },
        {
          path: "settings",
          element: withSuspense(SettingsPage),
        },
        {
          path: "budget",
          element: withSuspense(BudgetPage),
        },
        {
          path: "more",
          element: withSuspense(MorePage),
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/chats" replace />,
    },
  ];

  return routes;
}

// ============================================================================
// Route Renderer
// ============================================================================

/**
 * Recursively render route configuration to React Router <Route> elements
 */
export function renderRoutes(routes: RouteConfig[]): ReactNode {
  return routes.map((route, index) => {
    if (route.children && route.children.length > 0) {
      return (
        <Route
          key={route.path || index}
          path={route.path}
          element={route.element}
        >
          {renderRoutes(route.children)}
        </Route>
      );
    }

    return (
      <Route
        key={route.path || index}
        path={route.path}
        element={route.element}
      />
    );
  });
}
