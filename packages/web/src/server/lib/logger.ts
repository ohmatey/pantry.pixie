/**
 * Structured logging with Pino
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Helper functions for common log patterns
export const logRequest = (request: Request, duration?: number) => {
  const { method, url } = request;
  logger.info({ method, url, duration }, "HTTP Request");
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error({ err: error, ...context }, error.message);
};

export const logWebSocket = (event: string, data?: Record<string, unknown>) => {
  logger.info({ event, ...data }, `WebSocket: ${event}`);
};
