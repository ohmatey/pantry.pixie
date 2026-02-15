# Pantry Pixie

[![CI](https://github.com/yourusername/pantry-pixie/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/pantry-pixie/actions/workflows/ci.yml)
[![Release](https://github.com/yourusername/pantry-pixie/actions/workflows/release.yml/badge.svg)](https://github.com/yourusername/pantry-pixie/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Your warm, witty kitchen companion. AI-powered grocery management that gets you.

## What is Pantry Pixie?

Pantry Pixie is an intelligent grocery and pantry management system designed for people who want to eat well without the mental overhead. Instead of wrestling with spreadsheets or forgetting what's in your cupboard, Pantry Pixie uses conversational AI to help you track inventory, plan meals, manage budgets, and make smarter shopping decisions.

It lives where you live — on your phone, in your kitchen, at the store. It knows your home, your habits, and your constraints. It speaks like a friend, not a robot.

## Why Pantry Pixie Exists

Grocery management is broken. Most apps are either:
- **Too simple** (boring checklists)
- **Too complex** (enterprise software for your kitchen)
- **Too impersonal** (cold, corporate tone)

Pantry Pixie fixes this. It combines:
- **Real AI intelligence** — understands context, intent, and nuance
- **Warm personality** — calm, encouraging, occasionally witty
- **Mobile-first design** — built for real kitchens, not just desks
- **Privacy-conscious** — your data stays yours
- **Developer-friendly** — open architecture, extensible system

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/pantry-pixie.git
cd pantry-pixie

# Install dependencies (with Bun)
bun install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Run migrations
bun run db:push

# Start development
bun run dev
```

The web PWA will be available at `http://localhost:3000`.

## Architecture Overview

Pantry Pixie is built as a Bun monorepo with four main packages:

### **@pantry-pixie/core**
Shared logic, database schemas, and types. Contains:
- **Drizzle ORM schemas** — User, Home, Item, GroceryList, Chat, etc.
- **TypeScript types** — comprehensive entity definitions
- **Pixie personality system** — system prompt, intent classification, response templates
- **Shared utilities** — validation, helpers, constants

### **@pantry-pixie/sdk**
TypeScript SDK for integrating Pantry Pixie into other apps. Provides:
- `PantryPixieClient` class for API communication
- Methods for homes, items, lists, and chat
- Type-safe request/response handling
- Built for Bun and Node.js

### **@pantry-pixie/cli**
Command-line interface for power users and automation. Includes:
- Home and inventory management
- Batch operations
- Configuration management
- Integration with shell workflows

### **@pantry-pixie/web**
Progressive Web App (MVP). Features:
- Bun-based HTTP server with WebSocket support
- Real-time chat interface with Pixie
- Inventory management UI
- Grocery list creation and tracking
- Budget insights and meal planning
- Fully offline-capable with service workers
- Installable as native app on mobile

## Key Features

- **Conversational Inventory** — Just tell Pixie what you bought or what you need
- **Smart Shopping** — Get suggestions based on what you have and what's on sale
- **Budget Awareness** — Track spending, get alerts on budget thresholds
- **Multi-home Support** — Manage inventory across multiple homes or locations
- **Recurring Items** — Automatically remind you to restock essentials
- **Rich Chat Interface** — Ask Pixie anything about your pantry, budget, or meal prep
- **Real-time Sync** — Changes sync instantly across all devices

## Technology Stack

- **Runtime**: Bun (fast, modern, built-in TypeScript)
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: Web Components / minimal framework (Web PWA)
- **API**: REST + WebSocket via Bun HTTP server
- **AI**: Mastra.ai for agentic capabilities
- **Language**: TypeScript (strict mode)

## Development

### Scripts

```bash
# Development
bun run dev              # Start dev server (web package)

# Building
bun run build            # Build all packages
bun run build:core       # Build just core
bun run build:sdk        # Build just SDK
bun run build:cli        # Build just CLI
bun run build:web        # Build just web

# Database
bun run db:generate      # Generate Drizzle migrations
bun run db:push          # Apply migrations to database
bun run db:studio        # Open Drizzle Studio (web GUI)

# Quality
bun run test             # Run all tests
bun run lint             # Lint code
bun run format           # Format with Prettier
bun run type-check       # Type check all packages
```

### Project Structure

```
pantry.pixie/
├── packages/
│   ├── core/        # Shared schemas, types, Pixie personality
│   ├── sdk/         # TypeScript client library
│   ├── cli/         # Command-line interface
│   └── web/         # Progressive Web App
├── bunfig.toml      # Bun configuration
├── tsconfig.json    # Root TypeScript config
├── package.json     # Workspace root
└── README.md        # You are here
```

## Deployment

### Docker Deployment

The easiest way to deploy Pantry Pixie is using Docker:

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or build and run manually
docker build -t pantry-pixie .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e OPENAI_API_KEY="sk-..." \
  pantry-pixie
```

### Environment Variables

Required environment variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for JWT token signing (32+ characters recommended)
- `OPENAI_API_KEY` — OpenAI API key for Pixie AI features

Optional:
- `PORT` — Server port (default: 3000)
- `HOST` — Server hostname (default: localhost)
- `NODE_ENV` — Environment mode (production/development)

### Production Checklist

Before deploying to production:

1. **Security**
   - [ ] Change `JWT_SECRET` to a strong random value
   - [ ] Use secure PostgreSQL credentials
   - [ ] Enable HTTPS/TLS
   - [ ] Review CORS settings in `packages/web/src/server/index.ts`

2. **Database**
   - [ ] Run migrations: `bun run db:push`
   - [ ] Set up automated backups
   - [ ] Configure connection pooling

3. **Monitoring**
   - [ ] Set up health check monitoring on `/health`
   - [ ] Configure log aggregation
   - [ ] Set up error tracking (Sentry, etc.)

4. **Performance**
   - [ ] Enable CDN for static assets
   - [ ] Configure reverse proxy (nginx, Caddy)
   - [ ] Set up rate limiting

### Release Process

Releases are automated via GitHub Actions:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# This triggers:
# 1. Full CI verification (lint, test, build)
# 2. Docker image build and push to GitHub Container Registry
# 3. GitHub release creation with changelog
# 4. Optional deployment to production
```

Docker images are published to `ghcr.io/yourusername/pantry-pixie`.

### Manual Deployment

For manual deployment without Docker:

```bash
# Build all packages
bun run build

# Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your-secret"
export OPENAI_API_KEY="sk-..."
export NODE_ENV="production"

# Run migrations
bun run db:push

# Start the server
cd packages/web
bun run start
```

The server will listen on `http://localhost:3000` by default.

### Health Monitoring

The server exposes a health endpoint at `/health`:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-02-15T12:00:00.000Z","uptime":123.45,"agent":"ready"}
```

Use this endpoint for:
- Docker health checks
- Load balancer health probes
- Uptime monitoring services

## Contributing

We love contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Setting up your development environment
- Code style and conventions
- Testing expectations
- Pull request process
- Reporting issues and suggesting features

## Philosophy

Pantry Pixie is built on these principles:

1. **Warm, not cold** — Technology should feel human. We design interfaces and language that feel like chatting with a friend, not debugging a computer.

2. **Privacy first** — Your grocery data is personal. We minimize what we send to external services and give you full control.

3. **Simple, not simplistic** — We hide complexity without removing capability. New users can start immediately; power users can dive deep.

4. **Open by design** — SDK, CLI, and APIs mean developers can build on Pantry Pixie's foundation.

5. **Solve real problems** — We obsess over actual user needs, not feature checklists.

## Status

Pantry Pixie is in active development. We're currently building the MVP (web PWA). Android/iOS native apps and advanced features are on the roadmap.

## License

MIT License — see [LICENSE](./LICENSE) for details.

## Questions?

- **Issues & bugs**: [GitHub Issues](https://github.com/yourusername/pantry-pixie/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pantry-pixie/discussions)
- **Email**: hello@pantryx.pixie (coming soon)

---

*Pantry Pixie: Because grocery management shouldn't require a Ph.D. in spreadsheets.*
