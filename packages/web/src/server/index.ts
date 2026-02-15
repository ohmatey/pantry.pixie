#!/usr/bin/env bun

/**
 * @pantry-pixie/web — Bun HTTP + WebSocket server
 */

// Validate environment variables first
import { env } from "./config/env";
import { registerApiRoutes } from "./api";
import {
  handleWebSocketOpen,
  handleWebSocketMessage,
  handleWebSocketClose,
  type WSData,
} from "./ws";
import { initializeAgent } from "./agent";
import { jwtVerify } from "jose";
import path from "path";
import fs from "fs";
import { logger, logError } from "./lib/logger";
import { rateLimit } from "./middleware/rate-limit";
import { addSecurityHeaders } from "./middleware/security-headers";
import { errorResponse, createError } from "./middleware/error-handler";

const PORT = env.PORT;
const HOST = env.HOST;
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const IS_PRODUCTION = env.NODE_ENV === "production";
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT = env.REQUEST_TIMEOUT; // ms
const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

// Resolve static directory for production builds
const STATIC_DIR = path.resolve(import.meta.dir, "../../dist/client");

const agentReady = await initializeAgent();

function matchRoute(
  pathname: string,
  method: string,
  routes: Array<{ method: string; path: string }>
): {
  route: (typeof routes)[0] | null;
  params: Record<string, string>;
} {
  for (const route of routes) {
    if (route.method !== method) continue;

    const pathPattern = route.path
      .replace(/\//g, "\\/")
      .replace(/:(\w+)/g, "(?<$1>[^\\/]+)");

    const regex = new RegExp(`^${pathPattern}$`);
    const match = pathname.match(regex);

    if (match) {
      return { route, params: match.groups || {} };
    }
  }

  return { route: null, params: {} };
}

function addCorsHeaders(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);

  // In production, only allow specific origins
  if (IS_PRODUCTION && ALLOWED_ORIGINS.length > 0) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
  } else {
    // Development: allow all origins for easier testing
    headers.set("Access-Control-Allow-Origin", origin || "*");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const server = Bun.serve<WSData>({
  hostname: HOST,
  port: PORT,

  async fetch(request, server) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const pathname = url.pathname;
    const origin = request.headers.get("origin");

    try {
      // Health check endpoint (bypass rate limiting and auth)
      if (pathname === "/health" && request.method === "GET") {
        return new Response(
          JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            agent: agentReady ? "ready" : "initializing",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Rate limiting (apply to all requests except health check)
      const rateLimitResponse = await rateLimit(request);
      if (rateLimitResponse) {
        logger.warn({ url: pathname, method: request.method }, 'Rate limit exceeded');
        return addSecurityHeaders(rateLimitResponse);
      }

      // Request size limit
      if (request.body) {
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
          return errorResponse(
            createError("Payload Too Large", 413, "PAYLOAD_TOO_LARGE"),
            request
          );
        }
      }

      // CORS preflight
      if (request.method === "OPTIONS") {
        return addSecurityHeaders(addCorsHeaders(new Response(null, { status: 204 }), origin));
      }

      // WebSocket upgrade
      if (request.headers.get("upgrade") === "websocket") {
        if (pathname === "/api/ws" || pathname === "/ws") {
          // Extract token from Sec-WebSocket-Protocol header (more secure than query params)
          const protocols = request.headers.get("sec-websocket-protocol")?.split(',') || [];
          const authProtocol = protocols.find(p => p.trim().startsWith('auth-'));
          const token = authProtocol?.trim().slice(5); // Remove 'auth-' prefix

          let wsData: WSData = { userId: "", homeId: "" };

          if (token) {
            try {
              const { payload } = await jwtVerify(token, JWT_SECRET);
              wsData = {
                userId: payload.userId as string,
                homeId: payload.homeId as string,
              };
              logger.info({ userId: wsData.userId, homeId: wsData.homeId }, 'WebSocket authenticated');
            } catch (error) {
              logger.warn({ error }, 'WebSocket authentication failed');
              return new Response("Unauthorized", { status: 401 });
            }
          }

          const success = server.upgrade(request, { data: wsData });
          if (success) return undefined as unknown as Response;
          return new Response("WebSocket upgrade failed", { status: 500 });
        }
      }

      // API routes
      const apiRoutes = registerApiRoutes();
      const { route: matchedRoute, params } = matchRoute(pathname, request.method, apiRoutes);

      if (matchedRoute) {
        const handler = apiRoutes.find((r) => r.path === matchedRoute.path && r.method === matchedRoute.method)?.handler;
        if (handler) {
          const response = await Promise.race([
            handler(request, params),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT)
            ),
          ]).catch((err) => {
            if (err.message === "Request timeout") {
              logger.warn({ url: pathname, method: request.method, timeout: REQUEST_TIMEOUT }, 'Request timed out');
              return errorResponse(createError("Request Timeout", 408, "REQUEST_TIMEOUT"), request);
            }
            throw err;
          });
          const duration = Date.now() - startTime;
          logger.info({ method: request.method, url: pathname, status: response.status, duration }, 'HTTP Request');
          return addSecurityHeaders(addCorsHeaders(response, origin));
        }
      }

      // Serve static files in production
      if (IS_PRODUCTION) {
        const filePath = path.join(STATIC_DIR, pathname === "/" ? "index.html" : pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return addSecurityHeaders(new Response(Bun.file(filePath)));
        }
        // SPA fallback
        const indexPath = path.join(STATIC_DIR, "index.html");
        if (fs.existsSync(indexPath)) {
          return addSecurityHeaders(new Response(Bun.file(indexPath), {
            headers: { "Content-Type": "text/html" },
          }));
        }
      }

      // PWA assets (dev mode fallback)
      if (pathname === "/manifest.json") {
        return new Response(Bun.file(path.resolve(import.meta.dir, "../../public/manifest.json")));
      }

      if (pathname === "/sw.js") {
        return new Response(Bun.file(path.resolve(import.meta.dir, "../../public/sw.js")), {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      return addSecurityHeaders(new Response("Not found", { status: 404 }));
    } catch (error) {
      // Catch-all error handler
      logError(error as Error, { url: pathname, method: request.method });
      return addSecurityHeaders(errorResponse(error as Error, request));
    }
  },

  websocket: {
    open(ws) {
      handleWebSocketOpen(ws);
    },
    message(ws, message) {
      handleWebSocketMessage(ws, message);
    },
    close(ws) {
      handleWebSocketClose(ws);
    },
    error(ws, error) {
      logError(error as Error, { component: 'WebSocket' });
    },
  },
});

logger.info({
  host: HOST,
  port: PORT,
  mode: IS_PRODUCTION ? "production" : "development",
  allowedOrigins: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : "all (dev mode)",
}, 'Pantry Pixie Server started');
