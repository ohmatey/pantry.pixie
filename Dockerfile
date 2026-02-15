# Pantry Pixie Production Dockerfile
# Multi-stage build for optimized production image

FROM oven/bun:1.3.9-slim AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/core/package.json ./packages/core/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/web/package.json ./packages/web/
COPY packages/cli/package.json ./packages/cli/
RUN bun install --frozen-lockfile --production=false

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build all packages
RUN bun run build

# Production image
FROM oven/bun:1.3.9-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

# Copy necessary files
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/sdk/package.json ./packages/sdk/package.json
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json

# Switch to non-root user
USER bunuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run --bun fetch http://localhost:3000/health || exit 1

# Start the web server
CMD ["bun", "run", "--cwd", "packages/web", "start"]
