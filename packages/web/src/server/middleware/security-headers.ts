/**
 * Security headers middleware
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Prevent MIME sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // XSS protection (legacy but still useful)
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (restrict browser features)
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Vite in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' ws: wss:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  if (!IS_PRODUCTION) {
    // Allow Vite HMR in development
    cspDirectives[2] = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    cspDirectives[4] =
      "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*";
  }

  headers.set("Content-Security-Policy", cspDirectives.join("; "));

  // HTTPS enforcement (only in production)
  if (IS_PRODUCTION) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
