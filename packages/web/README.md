# @pantry-pixie/web

The Pantry Pixie web application — a PWA with a Bun HTTP server, WebSocket real-time chat, and a React frontend.

> This package is the app itself and is not published to npm.

## Tech stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Server   | Bun native HTTP + WebSocket          |
| Database | PostgreSQL + Drizzle ORM             |
| Auth     | JWT (jose) + Argon2id (Bun.password) |
| AI       | Vercel AI SDK + OpenAI gpt-4o-mini   |
| Frontend | React 19 + React Router              |
| State    | Zustand (auth) + React Query (data)  |
| Styling  | Tailwind CSS                         |
| Build    | Vite + vite-plugin-pwa               |

## Environment variables

Create a `.env` file in the repository root:

```bash
# Required
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantry_pixie
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-...

# Optional
PORT=3000          # Server port (default: 3000)
HOST=localhost     # Server host (default: localhost)
NODE_ENV=production
```

## API routes

### Auth (public)

| Method | Path                 | Description                      |
| ------ | -------------------- | -------------------------------- |
| `POST` | `/api/auth/register` | Register (email, password, name) |
| `POST` | `/api/auth/login`    | Login — returns JWT + user       |
| `GET`  | `/api/auth/me`       | Current user (Bearer token)      |

### Homes (protected)

| Method | Path             | Description |
| ------ | ---------------- | ----------- |
| `GET`  | `/api/homes`     | List homes  |
| `GET`  | `/api/homes/:id` | Get home    |
| `POST` | `/api/homes`     | Create home |

### Items (protected)

| Method   | Path                           | Description            |
| -------- | ------------------------------ | ---------------------- |
| `GET`    | `/api/homes/:homeId/items`     | List items (paginated) |
| `GET`    | `/api/homes/:homeId/items/:id` | Get item               |
| `POST`   | `/api/homes/:homeId/items`     | Create item            |
| `PUT`    | `/api/homes/:homeId/items/:id` | Update item            |
| `DELETE` | `/api/homes/:homeId/items/:id` | Delete item            |

### Grocery lists (protected)

| Method | Path                           | Description        |
| ------ | ------------------------------ | ------------------ |
| `GET`  | `/api/homes/:homeId/lists`     | List grocery lists |
| `GET`  | `/api/homes/:homeId/lists/:id` | Get list           |
| `POST` | `/api/homes/:homeId/lists`     | Create list        |

### Chat (protected)

| Method | Path                                                 | Description   |
| ------ | ---------------------------------------------------- | ------------- |
| `GET`  | `/api/homes/:homeId/chat/threads`                    | List threads  |
| `POST` | `/api/homes/:homeId/chat/threads`                    | Create thread |
| `GET`  | `/api/homes/:homeId/chat/threads/:threadId/messages` | Get messages  |
| `POST` | `/api/homes/:homeId/chat/threads/:threadId/messages` | Send message  |

### WebSocket

Connect to `/ws?token=<jwt>` for real-time updates. Message types:

| Type               | Direction | Description                         |
| ------------------ | --------- | ----------------------------------- |
| `message`          | both      | Chat messages (user or assistant)   |
| `status`           | server    | Connection status, typing indicator |
| `inventory_update` | server    | Inventory changes                   |
| `ping` / `pong`    | both      | Keep-alive                          |
| `error`            | server    | Error messages                      |

## AI agent

The server runs a Pixie agent powered by gpt-4o-mini with 5 tools:

| Tool           | Description                     |
| -------------- | ------------------------------- |
| `addItem`      | Add item to pantry inventory    |
| `listItems`    | List items in a home            |
| `removeItem`   | Remove an item                  |
| `checkItem`    | Mark item as checked            |
| `setRecurring` | Set recurring purchase schedule |

Tools are scoped to a home via closures (`createAddItemTool(homeId)`).

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL
- OpenAI API key

### Setup

```bash
git clone <repo-url> && cd pantry.pixie
bun install

# Set up .env at repo root with DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
bun run db:push    # Apply schema to database
```

### Commands

```bash
bun run dev          # Start server (:3000) + Vite (:5173) concurrently
bun run dev:server   # Server only (Bun, port 3000)
bun run dev:client   # Vite only (port 5173)
bun run build:web    # Production build (Vite → dist/client)
bun run start        # Run production build
```

In development, Vite proxies `/api` and `/ws` requests to the Bun server on port 3000.

### Project structure

```
packages/web/
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker (cache-first)
├── src/
│   ├── server/
│   │   ├── index.ts          # Bun HTTP + WebSocket server
│   │   ├── api/
│   │   │   └── index.ts      # REST route definitions
│   │   ├── auth/
│   │   │   └── index.ts      # register, login, JWT, withAuth
│   │   ├── services/
│   │   │   └── chat.ts       # Chat business logic
│   │   ├── agent/
│   │   │   ├── index.ts      # createPixieResponse()
│   │   │   └── tools/        # 5 agent tools
│   │   └── ws/
│   │       └── index.ts      # WebSocket handlers + broadcasting
│   └── client/
│       ├── main.tsx           # React entry
│       ├── App.tsx            # Router + providers
│       ├── pages/             # ChatPage, ListPage, SettingsPage,
│       │                      #   LoginPage, RegisterPage
│       ├── components/
│       │   ├── layout/        # AppShell, AuthGuard
│       │   ├── chat/          # ChatBubble, ChatInput
│       │   └── ui/            # card, input, button, avatar, scroll-area
│       ├── hooks/
│       │   ├── useAuth.ts     # Zustand auth store
│       │   └── useWebSocket.ts
│       └── lib/
│           └── utils.ts
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```
