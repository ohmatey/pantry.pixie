/**
 * E2E test helpers — start a real Bun server and hit it with HTTP requests
 */

import { registerApiRoutes } from "../api";
import { TEST_EMAIL, TEST_PASSWORD } from "@pantry-pixie/core";

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function matchRoute(
  pathname: string,
  method: string,
  routes: Array<{ method: string; path: string }>,
) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const pathPattern = route.path
      .replace(/\//g, "\\/")
      .replace(/:(\w+)/g, "(?<$1>[^\\/]+)");
    const regex = new RegExp(`^${pathPattern}$`);
    const match = pathname.match(regex);
    if (match) return { route, params: match.groups || {} };
  }
  return { route: null, params: {} };
}

export interface TestServer {
  url: string;
  stop: () => void;
}

/**
 * Start a lightweight Bun HTTP server on port 0 (OS-assigned random port).
 * Only registers API routes — no WebSocket, no static files, no agent init.
 */
export function startServer(): TestServer {
  const apiRoutes = registerApiRoutes();

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0, // random available port
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        return addCorsHeaders(new Response(null, { status: 204 }));
      }
      const { route: matchedRoute, params } = matchRoute(
        url.pathname,
        request.method,
        apiRoutes,
      );
      if (matchedRoute) {
        const handler = apiRoutes.find(
          (r) =>
            r.path === matchedRoute.path && r.method === matchedRoute.method,
        )?.handler;
        if (handler) {
          const response = await handler(request, params);
          return addCorsHeaders(response);
        }
      }
      return new Response("Not found", { status: 404 });
    },
  });

  return {
    url: `http://127.0.0.1:${server.port}`,
    stop: () => server.stop(),
  };
}

/**
 * Log in the seed test user and return the auth token + user data.
 */
export async function loginSeedUser(baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    success: boolean;
    data: {
      token: string;
      user: { id: string; email: string; name: string; homeId: string };
    };
  };

  return { token: body.data.token, user: body.data.user };
}

/**
 * Convenience wrapper for authenticated fetch calls.
 */
export async function authedFetch(
  baseUrl: string,
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}
