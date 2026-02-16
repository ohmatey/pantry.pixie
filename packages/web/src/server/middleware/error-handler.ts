/**
 * Error handling and sanitization middleware
 */

import { logger } from "../lib/logger";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export function sanitizeError(error: AppError) {
  if (!IS_PRODUCTION) {
    // Development: return full error details
    return {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error.details,
    };
  }

  // Production: return generic error without sensitive details
  const status = error.status || 500;

  if (status >= 400 && status < 500) {
    // Client errors: safe to show message
    return {
      error: error.message || "Bad Request",
      code: error.code,
    };
  }

  // Server errors: hide details
  return {
    error: "Internal Server Error",
    message: "An unexpected error occurred. Please try again later.",
  };
}

export function errorResponse(error: AppError, request?: Request): Response {
  const status = error.status || 500;

  // Log error with context
  logger.error(
    {
      err: error,
      url: request?.url,
      method: request?.method,
      status,
    },
    "Request error",
  );

  return new Response(JSON.stringify(sanitizeError(error)), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createError(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown,
): AppError {
  const error = new Error(message) as AppError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}
