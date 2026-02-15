# Phase 1: MVP Web App / PWA (Weeks 4-8)

## Overview

Phase 1 launches Pantry Pixie as an installable Progressive Web App. The goal is to validate the core value proposition: helping households coordinate grocery shopping through conversational AI and real-time synchronization.

**Duration:** 5 weeks
**Goal:** Deploy a functional PWA that households can install on their phones and coordinate grocery lists
**Success Criteria:** 5+ beta users with >50% weekly active rate; <3 minute onboarding; real-time sync working seamlessly

---

## 1. Progressive Web App (PWA) Setup (Week 4, 4 days of effort)

### Objective
Transform the web package into a fully functional PWA with offline capability, service worker, and manifest.

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | React 19 | Industry standard; large ecosystem; strong PWA support |
| Build Tool | Vite | Fast builds; excellent PWA plugin support |
| State Management | TanStack Query + Zustand | Query for server state; Zustand for client state (minimal bundle) |
| UI Components | shadcn/ui | Headless, accessible, customizable |
| CSS | Tailwind CSS | Utility-first; works well with shadcn |
| Service Worker | Workbox | Google-maintained; handles precaching, runtime caching |

### Service Worker & Manifest

```typescript
// packages/web/public/manifest.json
{
  "name": "Pantry Pixie",
  "short_name": "Pixie",
  "description": "Household grocery coordination made easy",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#f5f1ed",
  "theme_color": "#2d5016",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "categories": ["productivity", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshot-540.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-1280.png",
      "sizes": "1280x800",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

```typescript
// packages/web/src/service-worker.ts (Workbox)
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheExpiration } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets (Vite will inject this)
precacheAndRoute(self.__WB_MANIFEST);

// Cache API calls with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheExpiration({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Cache images with stale-while-revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'image-cache',
  })
);

// Navigate requests (SPA): serve index.html for offline
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages',
    }),
    {
      denylist: [/^\/api/],
    }
  )
);
```

```typescript
// packages/web/src/main.tsx
import { useEffect } from 'react';

export function App() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service worker registered:', reg);
          // Check for updates periodically
          setInterval(() => reg.update(), 60000);
        })
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, []);

  return (
    <div>
      {/* App content */}
    </div>
  );
}
```

### Offline Sync Strategy

For Phase 1, we'll use a simple queue-based approach:

```typescript
// packages/web/src/lib/offline-queue.ts
export interface QueuedAction {
  id: string;
  type: 'add_item' | 'mark_purchased' | 'change_list_state';
  homeId: string;
  payload: any;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private db: IDBDatabase;

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
    const queuedAction: QueuedAction = {
      id: crypto.randomUUID(),
      ...action,
      timestamp: Date.now(),
      retries: 0,
    };

    const tx = this.db.transaction(['offline_queue'], 'readwrite');
    await tx.objectStore('offline_queue').add(queuedAction);
    return queuedAction.id;
  }

  async getAll(): Promise<QueuedAction[]> {
    const tx = this.db.transaction(['offline_queue'], 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('offline_queue').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(id: string) {
    const tx = this.db.transaction(['offline_queue'], 'readwrite');
    await tx.objectStore('offline_queue').delete(id);
  }
}

// When connection is restored:
async function flushQueue() {
  const queue = new OfflineQueue();
  const actions = await queue.getAll();

  for (const action of actions) {
    try {
      const response = await fetch(`/api/homes/${action.homeId}/actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.payload),
      });

      if (response.ok) {
        await queue.remove(action.id);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error: don't retry
        await queue.remove(action.id);
      }
    } catch (error) {
      // Network error: keep in queue for next sync
      console.warn(`Failed to sync action ${action.id}:`, error);
    }
  }
}

// Listen for online event
window.addEventListener('online', flushQueue);
```

### Vite Configuration

```typescript
// packages/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        // ... manifest config above
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
```

### Deliverables

- [ ] `packages/web/public/manifest.json` with app metadata
- [ ] Service worker setup with Workbox
- [ ] Offline queue (IndexedDB-backed)
- [ ] Connection detection (`online` / `offline` events)
- [ ] App shell architecture (layout that persists during navigation)
- [ ] Install prompts (A2HS - Add to Home Screen)
- [ ] Icons and screenshots (iOS + Android)

### Acceptance Criteria
```bash
# PWA checks:
1. Manifest valid (Chrome DevTools: Manifest tab)
2. Service worker installed and active
3. Offline mode works: disable network, app still loads
4. Install prompt shows on iOS and Android
5. Can be launched as standalone app
6. Icon displays on home screen
```

---

## 2. Mobile-First Responsive Design & Branding (Week 4, 5 days of effort)

### Objective
Create a cohesive, accessible, mobile-first interface with Pantry Pixie's visual identity.

### Brand Colors & Typography

```typescript
// packages/web/src/theme.ts
export const theme = {
  colors: {
    primary: '#2d5016',        // Sage green
    secondary: '#f5f1ed',      // Warm cream
    accent: '#3d4a2c',         // Charcoal
    success: '#4caf50',        // Light green
    warning: '#ff9800',        // Amber
    error: '#f44336',          // Red
    neutral: {
      50: '#fafafa',
      100: '#f5f1ed',          // Warm cream
      200: '#eeebe8',
      300: '#e0dcd8',
      400: '#9e9b96',
      500: '#757371',
      600: '#5a5856',
      700: '#3d3b38',
      800: '#2a2825',
      900: '#1a1815',
    },
  },
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'Fira Code, monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '2rem',    // 32px
    },
  },
};

// Tailwind config
export const tailwindConfig = {
  theme: {
    extend: {
      colors: theme.colors,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.fontSize,
    },
  },
};
```

### Layout Components

```typescript
// packages/web/src/components/layout/AppShell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">🍃 Pixie</h1>
          </div>
          <button className="p-2 hover:bg-neutral-100 rounded-full">
            <Menu className="w-6 h-6 text-accent" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="bg-white border-t border-neutral-200 fixed bottom-0 left-0 right-0 z-40">
        <div className="flex justify-around max-w-2xl mx-auto">
          <NavLink to="/list" icon={<ShoppingCart />} label="List" />
          <NavLink to="/chat" icon={<MessageCircle />} label="Chat" />
          <NavLink to="/settings" icon={<Settings />} label="Settings" />
        </div>
      </nav>

      {/* Safe area adjustment for notch */}
      <style>{`
        body {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
```

### Responsive Grid

```typescript
// packages/web/src/components/ResponsiveGrid.tsx
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

// Usage:
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3 columns
```

### Accessibility

```typescript
// packages/web/src/components/Button.tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
    secondary: 'bg-neutral-100 text-accent hover:bg-neutral-200 active:bg-neutral-300',
    ghost: 'text-primary hover:bg-primary/10 active:bg-primary/20',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm h-8',
    md: 'px-4 py-2.5 text-base h-10',
    lg: 'px-6 py-3 text-lg h-12',
  };

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <Spinner className="w-4 h-4 mr-2 inline-block" />}
      {children}
    </button>
  );
}
```

### Deliverables

- [ ] Tailwind config with Pantry Pixie colors
- [ ] Responsive layout components (AppShell, ResponsiveGrid)
- [ ] Button, input, card, and form components
- [ ] Touch-optimized hit targets (min 48px)
- [ ] Dark mode support (prefers-color-scheme)
- [ ] Accessibility audit (WCAG AA compliance)
- [ ] Brand guidelines document

### Acceptance Criteria
```
1. Mobile: single column, large tap targets, readable text
2. Tablet: multi-column layout, proper spacing
3. Desktop: max-width 1280px, sidebar navigation
4. Colors: sage green (#2d5016), cream (#f5f1ed), charcoal
5. Fonts: Inter for UI, readable at 16px minimum
6. A11y: keyboard navigation, screen reader support, color contrast >4.5:1
7. Performance: <3s load on 3G, <1.5s on 4G
```

---

## 3. Onboarding Flow (Weeks 4-5, 4 days of effort)

### Objective
Guide first-time users through signup, home creation, partner invitation, and Pixie intro.

### Flow Diagram

```
1. Landing Page (Splash)
   ↓
2. Signup / Login
   ↓
3. Create Home
   ↓
4. Invite Partner (Optional)
   ↓
5. Pixie Intro
   ↓
6. First List (Empty state with prompt)
   ↓
7. App Shell (Chat + List)
```

### Implementation

```typescript
// packages/web/src/pages/Onboarding.tsx
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

export function OnboardingFlow() {
  const [step, setStep] = React.useState(0);
  const navigate = useNavigate();

  const steps = [
    <LandingPage onNext={() => setStep(1)} />,
    <SignupStep onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <CreateHomeStep onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <InvitePartnerStep onNext={() => setStep(4)} onSkip={() => setStep(4)} />,
    <PixieIntroStep onNext={() => navigate('/app')} />,
  ];

  return <>{steps[step]}</>;
}

// Step 1: Landing page
function LandingPage({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-primary/10 to-secondary p-4">
      <h1 className="text-4xl font-bold text-primary mb-4">🍃 Pantry Pixie</h1>
      <p className="text-lg text-accent text-center mb-8 max-w-sm">
        Household grocery coordination made delightful
      </p>
      <Button size="lg" onClick={onNext}>Get Started</Button>
    </div>
  );
}

// Step 2: Signup
function SignupStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
  });

  const signup = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Signup failed');
      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data;
    },
    onSuccess: onNext,
  });

  return (
    <div className="flex flex-col justify-center items-center h-screen p-4">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-accent mb-6">Create Account</h2>

        <input
          type="text"
          placeholder="Full name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 mb-3 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary"
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 mb-3 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary"
        />

        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full px-4 py-3 mb-6 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary"
        />

        <Button
          size="lg"
          className="w-full mb-3"
          onClick={() => signup.mutate()}
          disabled={signup.isPending}
        >
          {signup.isPending ? 'Creating...' : 'Create Account'}
        </Button>

        <p className="text-center text-neutral-600 mb-3">
          Already have an account? <a href="#" onClick={onBack} className="text-primary font-medium">Login</a>
        </p>
      </div>
    </div>
  );
}

// Step 3: Create Home
function CreateHomeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [homeData, setHomeData] = React.useState({
    name: 'Our Home',
  });

  const createHome = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/homes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(homeData),
      });
      if (!response.ok) throw new Error('Create home failed');
      const data = await response.json();
      localStorage.setItem('homeId', data.id);
      return data;
    },
    onSuccess: onNext,
  });

  return (
    <div className="flex flex-col justify-center items-center h-screen p-4">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-accent mb-2">Name Your Home</h2>
        <p className="text-neutral-600 mb-6">
          This is where you'll coordinate groceries together.
        </p>

        <input
          type="text"
          placeholder="e.g., Apartment 42, The Garden House"
          value={homeData.name}
          onChange={(e) => setHomeData({ ...homeData, name: e.target.value })}
          className="w-full px-4 py-3 mb-6 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary"
        />

        <Button
          size="lg"
          className="w-full mb-3"
          onClick={() => createHome.mutate()}
          disabled={createHome.isPending}
        >
          {createHome.isPending ? 'Creating...' : 'Continue'}
        </Button>

        <Button variant="ghost" className="w-full" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}

// Step 4: Invite Partner
function InvitePartnerStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [email, setEmail] = React.useState('');

  const invite = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const homeId = localStorage.getItem('homeId');
      const response = await fetch(`/api/homes/${homeId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Invite failed');
      return response.json();
    },
    onSuccess: onNext,
  });

  return (
    <div className="flex flex-col justify-center items-center h-screen p-4">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-accent mb-2">Invite Your Partner</h2>
        <p className="text-neutral-600 mb-6">
          Coordinate together, or skip for now and invite later.
        </p>

        <input
          type="email"
          placeholder="partner@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 mb-6 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary"
        />

        <Button
          size="lg"
          className="w-full mb-3"
          onClick={() => invite.mutate()}
          disabled={invite.isPending || !email}
        >
          {invite.isPending ? 'Sending...' : 'Send Invite'}
        </Button>

        <Button variant="secondary" className="w-full" onClick={onSkip}>
          Skip for Now
        </Button>
      </div>
    </div>
  );
}

// Step 5: Pixie Intro
function PixieIntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-primary/10 to-secondary p-4">
      <div className="text-center max-w-sm">
        <h2 className="text-4xl mb-4">🍃 Meet Pixie</h2>
        <p className="text-lg text-neutral-600 mb-6">
          I'm here to help your household coordinate groceries naturally. Just chat with me like you would a friend.
        </p>

        <div className="bg-white rounded-lg p-4 mb-6 text-left border border-primary/20">
          <p className="text-sm font-medium text-primary mb-2">Try saying:</p>
          <ul className="text-sm text-neutral-600 space-y-1">
            <li>• "We need eggs and milk"</li>
            <li>• "Add butter, organic if possible"</li>
            <li>• "What's on our list?"</li>
          </ul>
        </div>

        <Button size="lg" className="w-full" onClick={onNext}>
          Let's Go!
        </Button>
      </div>
    </div>
  );
}
```

### Acceptance Criteria
```
1. Onboarding completes in <3 minutes
2. Email verification (if needed) doesn't block flow
3. Back button works at each step
4. Session persists (can refresh without losing data)
5. Mobile-responsive (no horizontal scrolling)
6. Accessible (keyboard navigation, screen readers)
```

---

## 4. Chat Interface with Pixie (Weeks 4-6, 6 days of effort)

### Objective
Build a conversational interface where users can naturally add items and configure recurring groceries.

### Component Structure

```typescript
// packages/web/src/pages/ChatPage.tsx
export function ChatPage() {
  const homeId = localStorage.getItem('homeId')!;
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const threadQuery = useQuery({
    queryKey: ['chatThread', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/threads?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch thread');
      const threads = await response.json();
      return threads[0];
    },
  });

  const threadId = threadQuery.data?.id;

  const sendMessage = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: inputValue }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (newMessage) => {
      setMessages([...messages, newMessage]);
      setInputValue('');
      // Auto-scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    },
  });

  // WebSocket: listen for Pixie responses
  React.useEffect(() => {
    if (!threadId) return;

    const ws = new WebSocket(
      `${process.env.REACT_APP_WS_URL}/ws/${homeId}?token=${localStorage.getItem('token')}`
    );

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'chat_message' && message.threadId === threadId) {
        setMessages((prev) => [...prev, message]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    return () => ws.close();
  }, [threadId, homeId]);

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg.content}
            isPixie={msg.author === 'pixie'}
            action={msg.metadata?.action}
            confidence={msg.metadata?.confidence}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-neutral-200">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tell Pixie what you need..."
            className="flex-1 px-4 py-3 border border-neutral-300 rounded-full focus:ring-primary focus:border-primary"
          />
          <Button
            variant="primary"
            size="md"
            disabled={sendMessage.isPending || !inputValue.trim()}
            onClick={() => sendMessage.mutate()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Chat bubble with action confirmation
function ChatBubble({
  message,
  isPixie,
  action,
  confidence,
}: {
  message: string;
  isPixie: boolean;
  action?: any;
  confidence?: number;
}) {
  const [showConfirm, setShowConfirm] = React.useState(false);

  return (
    <div className={`flex ${isPixie ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`
          max-w-xs px-4 py-3 rounded-lg
          ${isPixie
            ? 'bg-primary/10 text-accent'
            : 'bg-primary text-white'
          }
        `}
      >
        <p className="text-sm">{message}</p>

        {/* Low confidence indicator */}
        {isPixie && confidence && confidence < 0.85 && (
          <p className="text-xs mt-2 opacity-75">
            Confidence: {(confidence * 100).toFixed(0)}%
          </p>
        )}

        {/* Action confirmation */}
        {isPixie && action && !showConfirm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="mt-2 text-xs"
          >
            Add to list?
          </Button>
        )}

        {showConfirm && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-medium">
              Add: {action.payload.name} (qty: {action.payload.quantity})
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => confirmAction(action)}
              >
                Yes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Recurring Item Setup

```typescript
// packages/web/src/components/RecurringSetup.tsx
export function RecurringSetup({
  itemId,
  itemName,
  onComplete,
}: {
  itemId: string;
  itemName: string;
  onComplete: (frequency: string) => void;
}) {
  const frequencies = ['weekly', 'biweekly', 'monthly'];

  return (
    <div className="p-4 bg-primary/10 rounded-lg">
      <p className="font-medium mb-3">
        Set {itemName} to repeat?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {frequencies.map((freq) => (
          <Button
            key={freq}
            variant="secondary"
            size="sm"
            onClick={() => onComplete(freq)}
            className="capitalize"
          >
            {freq}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2"
        onClick={() => onComplete('none')}
      >
        Just Once
      </Button>
    </div>
  );
}
```

### Deliverables

- [ ] Chat page with message history
- [ ] Message input with send button
- [ ] Chat bubbles (user vs. Pixie styling)
- [ ] Action confirmation UI
- [ ] Recurring frequency selector
- [ ] WebSocket integration for real-time messages
- [ ] Optimistic UI updates (show message immediately)
- [ ] Loading states and error handling

---

## 5. Grocery List View (Weeks 5-6, 5 days of effort)

### Objective
Display the current grocery list with intuitive item states and transitions.

### List States
- **Draft**: Items added, not yet approved for shopping
- **Approved**: Ready to shop; visible to both partners
- **Completed**: Shopping finished; archived

### Item States
- **Pending**: In the list, not yet purchased
- **Purchased**: Marked as bought
- **Removed**: Deleted from list

### Component Structure

```typescript
// packages/web/src/pages/GroceryListPage.tsx
export function GroceryListPage() {
  const homeId = localStorage.getItem('homeId')!;
  const token = localStorage.getItem('token')!;

  const listQuery = useQuery({
    queryKey: ['groceryList', homeId],
    queryFn: async () => {
      const response = await fetch(`/api/homes/${homeId}/lists?state=draft`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch list');
      const lists = await response.json();
      return lists[0]; // Current draft
    },
  });

  const list = listQuery.data;

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-accent mb-2">
          {list?.state === 'draft' ? 'Draft' : 'List'}
        </h1>
        <p className="text-neutral-600">
          {list?.items?.length || 0} items ready
        </p>
      </div>

      {/* Items */}
      {list?.items && list.items.length > 0 ? (
        <GroceryListItems
          items={list.items}
          listId={list.id}
          homeId={homeId}
        />
      ) : (
        <EmptyState />
      )}

      {/* Actions */}
      <div className="fixed bottom-20 left-4 right-4 space-y-2">
        {list?.state === 'draft' && (
          <>
            <Button
              size="lg"
              className="w-full"
              onClick={() => changeListState('approved')}
            >
              Ready to Shop
            </Button>
            <Button variant="secondary" className="w-full">
              Clear Draft
            </Button>
          </>
        )}

        {list?.state === 'approved' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => changeListState('completed')}
          >
            Done Shopping
          </Button>
        )}
      </div>
    </div>
  );
}

// Grocery list items with swipe-to-action
function GroceryListItems({
  items,
  listId,
  homeId,
}: {
  items: any[];
  listId: string;
  homeId: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <GroceryListItem
          key={item.id}
          item={item}
          listId={listId}
          homeId={homeId}
        />
      ))}
    </div>
  );
}

function GroceryListItem({
  item,
  listId,
  homeId,
}: {
  item: any;
  listId: string;
  homeId: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const token = localStorage.getItem('token')!;

  const markPurchased = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/homes/${homeId}/lists/${listId}/items/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ state: 'purchased' }),
        }
      );
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
  });

  const removeItem = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/homes/${homeId}/lists/${listId}/items/${item.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to remove item');
      return response.json();
    },
  });

  return (
    <div
      className={`
        p-4 bg-white border border-neutral-200 rounded-lg flex items-center justify-between
        transition-all cursor-pointer
        ${item.state === 'purchased' ? 'opacity-50' : ''}
        ${isOpen ? 'ring-2 ring-primary' : ''}
      `}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.state === 'purchased'}
        onChange={() => markPurchased.mutate()}
        className="w-6 h-6 cursor-pointer"
      />

      {/* Item info */}
      <div className="flex-1 ml-4">
        <p
          className={`
            font-medium
            ${item.state === 'purchased' ? 'line-through text-neutral-400' : 'text-accent'}
          `}
        >
          {item.name}
        </p>
        {item.description && (
          <p className="text-sm text-neutral-500">{item.description}</p>
        )}
        <p className="text-xs text-neutral-400 mt-1">
          {item.quantity} {item.unit} • {item.addedBy}
        </p>
      </div>

      {/* Actions menu */}
      {isOpen && (
        <div className="absolute right-4 top-full mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-left"
            onClick={(e) => {
              e.stopPropagation();
              removeItem.mutate();
            }}
          >
            Remove
          </Button>
          {item.recurring && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-left"
            >
              Edit Recurring
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-2xl mb-2">📭</p>
      <p className="text-neutral-600 mb-4">
        Your list is empty. Chat with Pixie to add items!
      </p>
    </div>
  );
}
```

### Acceptance Criteria
```
1. List displays all items with state visible
2. Checkbox marks item as purchased
3. Purchased items show as strikethrough
4. Swipe or click reveals delete option
5. List state transitions work (draft → approved → completed)
6. Real-time updates via WebSocket
7. Categories can be filtered/grouped (optional Phase 1+)
```

---

## 6. Real-Time Sync via WebSocket (Weeks 5-6, 4 days of effort)

### Objective
Ensure both partners see live updates to the grocery list and chat without page refresh.

### Events to Sync

```typescript
// packages/core/src/websocket/events.ts
export type SyncEvent =
  | { type: 'list_item_added'; listId: string; item: any; timestamp: Date }
  | { type: 'list_item_purchased'; listId: string; itemId: string; purchasedBy: string; timestamp: Date }
  | { type: 'list_state_changed'; listId: string; oldState: string; newState: string; timestamp: Date }
  | { type: 'chat_message'; threadId: string; message: any; timestamp: Date };
```

### Client-Side Integration

```typescript
// packages/web/src/hooks/useWebSocket.ts
export function useWebSocket(homeId: string) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState<any>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const ws = new WebSocket(
      `${process.env.REACT_APP_WS_URL}/ws/${homeId}?token=${localStorage.getItem('token')}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastEvent(data);

      // Invalidate relevant queries to refetch
      switch (data.type) {
        case 'list_item_added':
        case 'list_item_purchased':
        case 'list_state_changed':
          queryClient.invalidateQueries({ queryKey: ['groceryList', homeId] });
          break;
        case 'chat_message':
          queryClient.invalidateQueries({ queryKey: ['chatThread', homeId] });
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        // Reconnect logic
      }, 3000);
    };

    return () => ws.close();
  }, [homeId, queryClient]);

  return { isConnected, lastEvent };
}
```

### Server-Side Broadcasting

```typescript
// When an item is added, broadcast to all clients in the home
app.post('/homes/:homeId/lists/:listId/items', async (ctx) => {
  // ... add item logic

  // Broadcast to WebSocket
  broadcastToHome(homeId, {
    type: 'list_item_added',
    listId,
    item,
    timestamp: new Date(),
  });

  return { success: true, item };
});
```

### Deliverables

- [ ] WebSocket message handling in React components
- [ ] Query invalidation on sync events
- [ ] Reconnection logic (exponential backoff)
- [ ] Connection status indicator
- [ ] Offline queue for mutations
- [ ] Conflict resolution (last-write-wins for Phase 1)

---

## 7. Sunday Sync Ritual (Week 6, 3 days of effort)

### Objective
Implement a scheduled notification and interaction that encourages weekly grocery planning.

### Implementation

```typescript
// packages/core/src/services/sync-ritual.ts
import { schedule } from 'node-cron';

// Every Sunday at 10 AM, send notification to homes
schedule('0 10 * * 0', async () => {
  const homes = await db.query.homes.findMany();

  for (const home of homes) {
    const members = await db.query.homeMembers.findMany({
      where: (hm) => eq(hm.homeId, home.id),
    });

    for (const member of members) {
      // Send push notification
      await sendPushNotification(member.userId, {
        title: '🍃 Weekly Sync with Pixie',
        body: 'Shall we review your grocery list? Two minutes?',
        tag: 'weekly-sync',
      });
    }

    // Create a chat thread for the week
    const thread = await db.insert(chatThreads).values({
      homeId: home.id,
      title: `Weekly Sync - ${new Date().toISOString().split('T')[0]}`,
      context: { topic: 'weekly_sync' },
      createdBy: 'pixie',
    }).returning();

    // Pixie initiates conversation
    await sendPixieMessage(home.id, thread.id, {
      message: `Weekly check-in! We have ${/* count */} items in the draft. Ready to review together?`,
    });
  }
});
```

### Frontend Notification Handling

```typescript
// packages/web/src/hooks/usePushNotifications.ts
export function usePushNotifications() {
  React.useEffect(() => {
    if ('serviceWorkerContainer' in navigator) {
      navigator.serviceWorkerContainer.ready.then((registration) => {
        // Request notification permission
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }

        // Listen for notifications
        registration.addEventListener('message', (event) => {
          if (event.data.tag === 'weekly-sync') {
            // Open chat page
            window.location.hash = '/chat';
          }
        });
      });
    }
  }, []);
}
```

### Deliverables

- [ ] Cron job for Sunday 10 AM notification
- [ ] Push notification via service worker
- [ ] Pixie chat message initiating sync
- [ ] Deep link to chat page from notification
- [ ] User preference for notification timing
- [ ] Metrics: % of homes engaging with weekly sync

---

## 8. Multi-User Coordination (Weeks 5-7, 5 days of effort)

### Objective
Ensure both partners can edit the list without conflict, with neutral Pixie interactions.

### Concurrency Handling

For Phase 1, we'll use **last-write-wins** with optimistic UI updates:

```typescript
// When user marks item as purchased, optimistically update UI
const markPurchased = useMutation({
  mutationFn: async () => {
    // Optimistic: immediately update UI
    queryClient.setQueryData(['groceryList', homeId], (old: any) => ({
      ...old,
      items: old.items.map((item: any) =>
        item.id === itemId ? { ...item, state: 'purchased' } : item
      ),
    }));

    // Then sync to server
    const response = await fetch(`/api/homes/${homeId}/lists/${listId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'purchased' }),
    });

    if (!response.ok) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['groceryList', homeId] });
      throw new Error('Failed to update');
    }
  },
});
```

### Neutral Pixie Responses

Pixie should acknowledge both partners equally:

```typescript
// Pixie doesn't say "You bought eggs"; instead: "Eggs marked as purchased"
async function generatePixieAcknowledgment(action: string, itemName: string, byUser: string) {
  const neutralTemplates: Record<string, string[]> = {
    mark_purchased: [
      `Got it—${itemName} is checked off.`,
      `${itemName} purchased. Great!`,
      `Marking ${itemName} as done.`,
    ],
    remove_item: [
      `Removing ${itemName} from the list.`,
      `${itemName} removed.`,
    ],
    add_item: [
      `Added ${itemName} to the list.`,
      `${itemName} is on the list now.`,
    ],
  };

  const templates = neutralTemplates[action] || [];
  return templates[Math.floor(Math.random() * templates.length)];
}
```

### Activity Feed (Optional)

```typescript
// packages/web/src/components/ActivityFeed.tsx
export function ActivityFeed() {
  const homeId = localStorage.getItem('homeId')!;
  const [activities, setActivities] = React.useState<any[]>([]);

  // Subscribe to WebSocket events
  useWebSocket(homeId);

  // Map events to activity strings
  const activityStrings = {
    list_item_added: (event) => `${event.addedBy} added ${event.item.name}`,
    list_item_purchased: (event) => `${event.purchasedBy} marked ${event.item.name} as purchased`,
    list_state_changed: (event) => `List moved to "${event.newState}"`,
  };

  return (
    <div className="space-y-2 text-sm text-neutral-600">
      {activities.map((activity) => (
        <p key={activity.id}>{activityStrings[activity.type]?.(activity)}</p>
      ))}
    </div>
  );
}
```

### Deliverables

- [ ] Optimistic UI updates
- [ ] Server-side conflict resolution (last-write-wins)
- [ ] Neutral Pixie acknowledgments
- [ ] Activity/edit log visible to both partners
- [ ] Notification when partner edits list
- [ ] Clear authorship (who added, who purchased)

---

## 9. Budget Awareness (Week 7, 3 days of effort)

### Objective
Inform users about spending trends without judgment.

### Budget Tracking (Informational Only)

```typescript
// packages/core/src/services/budget.ts
export async function calculateWeeklySpending(homeId: string) {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const items = await db
    .select()
    .from(listItems)
    .innerJoin(items as any, eq(listItems.itemId, items.id))
    .where(
      and(
        eq(groceryLists.homeId, homeId),
        eq(groceryLists.state, 'completed'),
        gte(groceryLists.completedAt, lastWeek)
      )
    );

  const total = items.reduce(
    (sum, row) => sum + (parseFloat(row.items.estimatedPrice || '0') * row.listItems.quantity),
    0
  );

  return {
    total,
    itemCount: items.length,
    averagePerItem: total / items.length,
    currency: 'THB',
  };
}

// Pixie gives trends, not judgment
async function generateBudgetInsight(spending: any) {
  const insights = [
    `This week: ฿${spending.total.toFixed(2)} (${spending.itemCount} items)`,
    `Your average item: ฿${spending.averagePerItem.toFixed(2)}`,
    `Last week leaned snack-forward. Noticed more fresh produce this week.`,
  ];

  return insights[Math.floor(Math.random() * insights.length)];
}
```

### Frontend Display

```typescript
// packages/web/src/components/SpendingCard.tsx
export function SpendingCard({ homeId }: { homeId: string }) {
  const spendingQuery = useQuery({
    queryKey: ['spending', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/spending?period=week`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
  });

  const spending = spendingQuery.data;

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <p className="text-sm font-medium text-neutral-600 mb-2">This Week's Spending</p>
      <p className="text-2xl font-bold text-accent">฿{spending?.total.toFixed(2)}</p>
      <p className="text-xs text-neutral-500 mt-1">
        {spending?.itemCount} items • ฿{spending?.averagePerItem.toFixed(2)} average
      </p>
    </div>
  );
}
```

### Deliverables

- [ ] Calculate weekly/monthly spending from completed lists
- [ ] Spending card in dashboard
- [ ] Pixie insights on trends (non-judgmental)
- [ ] THB currency formatting (Bangkok launch)
- [ ] Historical spending view
- [ ] No budget limits or enforcement (Phase 4+)

---

## 10. THB Currency Handling (Week 6, 2 days of effort)

### Objective
Ensure all price displays use Thai Baht (฿) correctly.

### Implementation

```typescript
// packages/core/src/utils/currency.ts
export const THB = {
  code: 'THB',
  symbol: '฿',
  locale: 'th-TH',
};

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

// In components:
<p className="text-lg font-bold">{formatPrice(totalSpending)}</p>
```

### Deliverables

- [ ] THB formatting in all price displays
- [ ] Locale-aware number formatting
- [ ] Currency symbol (฿) consistent throughout
- [ ] No currency conversion (staying in THB for Bangkok)

---

## Phase 1 Acceptance Criteria (Hard Gate)

All must be true to proceed to Phase 2:

### 1. PWA
- [ ] Installable on iOS and Android
- [ ] Offline mode loads previous data
- [ ] Service worker caches static assets
- [ ] <3s load time on 3G

### 2. Onboarding
- [ ] Complete in <3 minutes
- [ ] All steps responsive on mobile
- [ ] Partner invitation works

### 3. Chat Interface
- [ ] Send/receive messages with Pixie
- [ ] Intent classification >80% accuracy
- [ ] Entity extraction >80% recall
- [ ] Recurring frequency setup works

### 4. Grocery List
- [ ] Display items with state (pending, purchased, removed)
- [ ] Mark items as purchased (with checkbox)
- [ ] Approve draft → completed state transitions
- [ ] List persists across sessions

### 5. Real-Time Sync
- [ ] WebSocket connects without error
- [ ] Messages deliver <500ms latency (p99)
- [ ] Both partners see updates live
- [ ] Reconnection works after network loss

### 6. Multi-User
- [ ] Two users can edit same list
- [ ] No data loss from concurrent edits
- [ ] Pixie responses are neutral
- [ ] Activity log shows who did what

### 7. Budget Awareness
- [ ] Spending calculated correctly (THB)
- [ ] Weekly insight displayed
- [ ] No judgment in messaging

### 8. Mobile UX
- [ ] Responsive from 320px to 1920px
- [ ] Touch targets >48px
- [ ] <3 second Time to Interactive
- [ ] Text readable at 16px minimum

### 9. Metrics
- [ ] 5+ beta users with >50% weekly active rate
- [ ] Onboarding completion: >80%
- [ ] Chat engagement: >3 messages/user/week
- [ ] Push notification opt-in: >70%

---

## Success Metrics for Phase 1

| Metric | Target | Owner |
|--------|--------|-------|
| Onboarding → First List | <5 min | UX Lead |
| WebSocket Latency (p99) | <500ms | Backend Lead |
| Chat Intent Accuracy | >80% | AI/ML Lead |
| Weekly Active Users | >5 | Product Lead |
| App Store Rating | >4.5 stars | Product Lead |
| Crash Rate | <0.1% | QA Lead |
| Offline Functionality | 100% works | Frontend Lead |

---

## Timeline Breakdown

| Week | Focus | Deliverables |
|------|-------|------------|
| 4 | PWA + Design | Service worker, responsive UI, Tailwind theme |
| 5 | Onboarding + Chat | Full signup flow, chat interface, Pixie integration |
| 6 | Grocery List | List display, item states, budget awareness |
| 7 | Real-time + Polish | WebSocket sync, multi-user, Sunday ritual |
| 8 | Testing + Launch | Beta testing, bug fixes, soft launch |

---

## Notes for Developers

1. **Start with the onboarding flow.** Get new users in fast, or lose them.
2. **Chat UX is critical.** Iterate on Pixie responses with real users.
3. **Real-time sync must feel seamless.** Test with simulated network latency.
4. **Offline support isn't just nice-to-have.** It's essential for mobile.
5. **Test on real devices.** Emulators miss performance and UX issues.

---

**Phase 1 Status:** Ready to Begin
**Estimated Effort:** 25 person-days
**Team Size:** 1 full-stack frontend, 1 backend engineer, 1 QA/testing
