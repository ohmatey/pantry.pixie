/**
 * Rate limiting middleware
 */

import { RateLimiterMemory } from "rate-limiter-flexible";
import { logger } from "../lib/logger";

const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_POINTS || "100"), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_DURATION || "60"), // Per 60 seconds
  blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || "60"), // Block for 60 seconds
});

export async function rateLimit(request: Request): Promise<Response | null> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  // Get IP from X-Forwarded-For header (reverse proxy) or fallback to connection
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  try {
    await rateLimiter.consume(ip);
    return null; // Allow request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (rejRes: any) {
    const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;

    logger.warn({ ip, retryAfter }, "Rate limit exceeded");

    return new Response(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": rateLimiter.points.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(
            Date.now() + rejRes.msBeforeNext,
          ).toISOString(),
        },
      },
    );
  }
}
