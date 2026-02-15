# Phase 4: Platform Expansion (Weeks 19-26)

## Overview

Phase 4 expands Pantry Pixie from a grocery-focused tool into a broader household steward. This phase introduces related domains (subscriptions, bills, utilities), integrates with major Thai platforms (LINE, GrabMart, Shopee), supports multiple languages, and establishes the monetization layer through premium features.

**Duration:** 8 weeks
**Goal:** Transform Pantry Pixie from a niche grocery app into a platform for household management
**Success Criteria:** 10K+ monthly active users; >$5K monthly revenue from premium; 5+ integration partners

---

## 1. Subscriptions & Home Supplies Tracking (Weeks 19-21, 7 days of effort)

### Objective
Track recurring subscriptions and bulk home supplies (toilet paper, laundry detergent, etc.) separately from groceries.

### Data Model

```typescript
// packages/core/src/entities/subscriptions.ts
export interface Subscription {
  id: string;
  homeId: string;
  name: string;                           // e.g., "Netflix", "Grocery Delivery"
  category: 'entertainment' | 'utilities' | 'services' | 'delivery';
  amount: number;                         // THB
  currency: string;                       // 'THB'
  billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface HomeSupply {
  id: string;
  homeId: string;
  name: string;                           // e.g., "Toilet Paper", "Dish Soap"
  quantity: number;
  unit: string;
  category: 'bathroom' | 'cleaning' | 'laundry' | 'paper' | 'other';
  estimatedDepletion: Date;
  lastPurchasedAt: Date;
  estimatedPrice: number;
  createdAt: Date;
}
```

### Services

```typescript
// packages/core/src/services/subscription-manager.ts
export async function createSubscription(
  homeId: string,
  data: Omit<Subscription, 'id' | 'createdAt' | 'createdBy'>
) {
  const subscription = await db.insert(subscriptions).values({
    ...data,
    homeId,
    createdBy: getCurrentUserId(), // From auth context
  }).returning();

  return subscription[0];
}

export async function getUpcomingBillings(homeId: string, daysAhead: number = 7) {
  const cutoff = addDays(new Date(), daysAhead);

  const upcoming = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.homeId, homeId),
        eq(subscriptions.isActive, true),
        lte(subscriptions.nextBillingDate, cutoff),
        gte(subscriptions.nextBillingDate, new Date())
      )
    )
    .orderBy(asc(subscriptions.nextBillingDate));

  return upcoming;
}

// Cron: process upcoming billings
export async function processUpcomingBillings() {
  const homes = await db.select({ id: homes.id }).from(homes);

  for (const home of homes) {
    const upcoming = await getUpcomingBillings(home.id, 3); // Next 3 days

    for (const sub of upcoming) {
      // Notify household
      const members = await db
        .select()
        .from(homeMembers)
        .where(eq(homeMembers.homeId, home.id));

      for (const member of members) {
        await notifyUser(member.userId, {
          type: NotificationType.BILLING_REMINDER,
          title: `Bill Due: ${sub.name}`,
          body: `฿${sub.amount.toFixed(2)} due on ${formatDate(sub.nextBillingDate)}`,
          data: { subscriptionId: sub.id },
        });
      }
    }
  }
}

// Home supplies manager
export async function createHomeSupply(
  homeId: string,
  data: Omit<HomeSupply, 'id' | 'createdAt'>
) {
  const supply = await db.insert(homeSupplies).values({
    ...data,
    homeId,
  }).returning();

  return supply[0];
}

export async function getSuppliesNeedingRestock(homeId: string, daysAhead: number = 7) {
  const cutoff = addDays(new Date(), daysAhead);

  const supplies = await db
    .select()
    .from(homeSupplies)
    .where(
      and(
        eq(homeSupplies.homeId, homeId),
        lte(homeSupplies.estimatedDepletion, cutoff)
      )
    )
    .orderBy(asc(homeSupplies.estimatedDepletion));

  return supplies;
}
```

### Pixie Integration

```typescript
// Pixie tracks subscriptions and supplies naturally
async function pixieUnderstandsSubscriptions(message: string, homeId: string) {
  // "Netflix is coming due next week" → learns subscription
  // "We need more toilet paper" → tracks as home supply

  const subscriptionIndicators = ['subscription', 'bill', 'monthly charge', 'renew', 'due'];
  const supplyIndicators = ['supplies', 'household', 'toilet paper', 'soap', 'detergent'];

  if (subscriptionIndicators.some((s) => message.toLowerCase().includes(s))) {
    // Extract subscription details
    const entities = await extractEntities(message);
    // Create subscription
  }

  if (supplyIndicators.some((s) => message.toLowerCase().includes(s))) {
    // Extract supply details
    const entities = await extractEntities(message);
    // Create home supply
  }
}

// Pixie proactively suggests
async function pixieSupplyReminder(homeId: string) {
  const supplies = await getSuppliesNeedingRestock(homeId, 3);
  if (supplies.length === 0) return null;

  const templates = [
    `Home supplies check: ${supplies[0].name} running low soon?`,
    `Don't forget ${supplies[0].name}—stock up soon?`,
    `Supply list: ${supplies.map((s) => s.name).join(', ')} coming up`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}
```

### API Endpoints

```typescript
// POST /homes/:homeId/subscriptions
// GET /homes/:homeId/subscriptions
// PATCH /homes/:homeId/subscriptions/:id
// DELETE /homes/:homeId/subscriptions/:id
// GET /homes/:homeId/subscriptions/upcoming

// POST /homes/:homeId/supplies
// GET /homes/:homeId/supplies
// PATCH /homes/:homeId/supplies/:id
// DELETE /homes/:homeId/supplies/:id
// GET /homes/:homeId/supplies/needing-restock
```

### Frontend UI

```typescript
// packages/web/src/components/SubscriptionsPanel.tsx
export function SubscriptionsPanel({ homeId }: { homeId: string }) {
  const subscriptionsQuery = useQuery({
    queryKey: ['subscriptions', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
  });

  const upcomingQuery = useQuery({
    queryKey: ['upcomingBillings', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/subscriptions/upcoming`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">Subscriptions</h3>
        {subscriptionsQuery.data?.map((sub: any) => (
          <div key={sub.id} className="p-3 bg-white border border-neutral-200 rounded-lg mb-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{sub.name}</p>
                <p className="text-sm text-neutral-500 capitalize">{sub.billingCycle}</p>
              </div>
              <p className="font-bold">฿{sub.amount.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-medium mb-3">Upcoming Bills</h3>
        {upcomingQuery.data?.map((sub: any) => (
          <div
            key={sub.id}
            className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2"
          >
            <p className="font-medium">{sub.name}</p>
            <p className="text-sm">Due: {formatDate(sub.nextBillingDate)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Deliverables

- [ ] Subscription tracking (create, update, delete)
- [ ] Home supplies tracking
- [ ] Upcoming billing notifications
- [ ] Supply restock predictions
- [ ] Pixie subscription understanding
- [ ] API endpoints for all operations
- [ ] Frontend subscription/supplies UI
- [ ] Billing reminder cron job

---

## 2. Bill & Utility Reminders (Week 20, 4 days of effort)

### Objective
Help households remember shared expenses like electricity, water, rent, internet.

### Data Model

```typescript
// packages/core/src/entities/bills.ts
export interface Bill {
  id: string;
  homeId: string;
  name: string;                           // e.g., "Electricity", "Water", "Internet"
  category: 'utilities' | 'rent' | 'insurance' | 'services';
  amount?: number;                        // Average amount, if known
  dueDate: number;                        // Day of month (1-31)
  isEstimated: boolean;
  lastPaidDate?: Date;
  notes?: string;
  createdAt: Date;
}

export interface BillPaymentHistory {
  id: string;
  billId: string;
  amountPaid: number;
  paidDate: Date;
  paidBy: string;                         // User ID
  notes?: string;
}
```

### Bill Tracking Service

```typescript
// packages/core/src/services/bill-tracker.ts
export async function getUpcomingBills(homeId: string) {
  const now = new Date();
  const currentDay = now.getDate();
  const bills = await db
    .select()
    .from(bills as any)
    .where(eq(bills.homeId, homeId));

  // Separate upcoming (due within 5 days) and overdue
  return bills
    .map((bill: any) => {
      let daysUntilDue: number;

      if (bill.dueDate > currentDay) {
        daysUntilDue = bill.dueDate - currentDay;
      } else {
        // Next month
        daysUntilDue = new Date(now.getFullYear(), now.getMonth() + 1, bill.dueDate).getTime() - now.getTime();
        daysUntilDue = Math.ceil(daysUntilDue / (24 * 60 * 60 * 1000));
      }

      return { ...bill, daysUntilDue };
    })
    .filter((b) => b.daysUntilDue >= -5 && b.daysUntilDue <= 7) // Past 5 days + next 7 days
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export async function recordBillPayment(
  homeId: string,
  billId: string,
  amount: number,
  paidBy: string
) {
  const payment = await db.insert(billPaymentHistory).values({
    billId,
    amountPaid: amount,
    paidDate: new Date(),
    paidBy,
  }).returning();

  // Update bill's lastPaidDate
  await db
    .update(bills)
    .set({ lastPaidDate: new Date() })
    .where(eq(bills.id, billId));

  return payment[0];
}

// Pixie integration
async function pixieBillReminder(homeId: string) {
  const upcoming = await getUpcomingBills(homeId);

  if (upcoming.length === 0) return null;

  const overdue = upcoming.filter((b) => b.daysUntilDue < 0);
  const dueSoon = upcoming.filter((b) => b.daysUntilDue >= 0 && b.daysUntilDue <= 2);

  if (overdue.length > 0) {
    return `Heads up: ${overdue.map((b) => b.name).join(', ')} overdue. Want me to remind you?`;
  }

  if (dueSoon.length > 0) {
    return `${dueSoon[0].name} due in ${dueSoon[0].daysUntilDue} days.`;
  }

  return null;
}
```

### API Endpoints

```typescript
// POST /homes/:homeId/bills
// GET /homes/:homeId/bills
// GET /homes/:homeId/bills/upcoming
// PATCH /homes/:homeId/bills/:id
// DELETE /homes/:homeId/bills/:id

// POST /homes/:homeId/bills/:id/payments
// GET /homes/:homeId/bills/:id/payments
```

### Deliverables

- [ ] Bill entity and tracking
- [ ] Payment history
- [ ] Upcoming bill calculation
- [ ] Bill reminders (Pixie integration)
- [ ] API endpoints
- [ ] Frontend bill management UI

---

## 3. LINE Integration (Weeks 21-23, 8 days of effort)

### Objective
Enable Pantry Pixie to work via LINE, Thailand's most popular messaging app.

### Architecture

```
User opens Pixie LINE Official Account
→ Chat with Pixie via LINE
→ Add items, view list, chat
→ Sync to web app in real-time
```

### Implementation

```typescript
// packages/core/src/integrations/line.ts
import { Client, LineBot } from '@line/bot-sdk';

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const lineBot = new LineBot({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// LINE User ↔ Pantry Pixie User mapping
export interface LINEUserMapping {
  id: string;
  lineUserId: string;
  pixieUserId: string;
  homeId: string;
  createdAt: Date;
}

// Handle incoming LINE messages
export async function handleLINEMessage(event: any) {
  const { type, message, source, replyToken } = event;

  if (type !== 'message' || message.type !== 'text') return;

  // Map LINE user to Pixie user
  const mapping = await findLINEUserMapping(source.userId);
  if (!mapping) {
    return replyToLine(replyToken, {
      type: 'text',
      text: 'Please sign up at https://pantry-pixie.app to get started!',
    });
  }

  // Process message like normal chat
  const response = await processPixieMessage(
    message.text,
    mapping.pixieUserId,
    mapping.homeId
  );

  // Send response back to LINE
  return replyToLine(replyToken, {
    type: 'text',
    text: response.message,
  });
}

// Send rich menu for quick actions
export async function sendLineRichMenu(lineUserId: string) {
  const richMenu = {
    size: {
      width: 2400,
      height: 810,
    },
    selected: true,
    areas: [
      {
        bounds: { x: 0, y: 0, width: 800, height: 810 },
        label: 'Add Item',
        action: {
          type: 'postback',
          label: 'Add Item',
          data: 'action=add_item',
          text: 'I want to add items',
        },
      },
      {
        bounds: { x: 800, y: 0, width: 800, height: 810 },
        label: 'View List',
        action: {
          type: 'postback',
          label: 'View List',
          data: 'action=view_list',
          text: 'Show me the list',
        },
      },
      {
        bounds: { x: 1600, y: 0, width: 800, height: 810 },
        label: 'Sync',
        action: {
          type: 'postback',
          label: 'Weekly Sync',
          data: 'action=sync',
          text: 'Let\'s do the weekly sync',
        },
      },
    ],
  };

  // Simplified: would create and set rich menu via LINE API
  console.log('Rich menu would be set for:', lineUserId);
}

// Sync back to LINE when list updates
export async function notifyLINEUser(lineUserId: string, message: string) {
  return lineClient.pushMessage(lineUserId, {
    type: 'text',
    text: message,
  });
}
```

### LINE Official Account Setup

```
1. Create LINE Official Account (@pantry-pixie)
2. Enable Messaging API
3. Set webhook URL: https://api.pantry-pixie.app/webhooks/line
4. Configure rich menus
5. Set greeting message
```

### Webhook Endpoint

```typescript
// POST /webhooks/line
app.post('/webhooks/line', async (ctx) => {
  const signature = ctx.headers.get('x-line-signature');
  const body = await ctx.req.text();

  // Verify LINE signature
  if (!verifyLineSignature(body, signature)) {
    return ctx.json({ success: false }, { status: 401 });
  }

  const events = JSON.parse(body).events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      await handleLINEMessage(event);
    }
  }

  return ctx.json({ success: true });
});

function verifyLineSignature(body: string, signature: string): boolean {
  const crypto = require('crypto');
  const secret = process.env.LINE_CHANNEL_SECRET;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}
```

### LINE User Setup

```typescript
// When user signs up via LINE
export async function linkLINEUser(lineUserId: string, pixieUserId: string, homeId: string) {
  const existing = await db.query.lineUserMappings.findFirst({
    where: eq(lineUserMappings.lineUserId, lineUserId),
  });

  if (existing) {
    // Update home
    await db
      .update(lineUserMappings)
      .set({ pixieUserId, homeId })
      .where(eq(lineUserMappings.lineUserId, lineUserId));
  } else {
    await db.insert(lineUserMappings).values({
      lineUserId,
      pixieUserId,
      homeId,
    });
  }

  // Send welcome message + rich menu
  await notifyLINEUser(lineUserId, '🍃 Welcome to Pantry Pixie! Ready to organize groceries?');
  await sendLineRichMenu(lineUserId);
}
```

### Deliverables

- [ ] LINE OAuth integration
- [ ] User mapping (LINE → Pixie)
- [ ] Webhook for incoming messages
- [ ] Rich menu setup
- [ ] Message formatting for LINE
- [ ] Sync notifications back to LINE
- [ ] LINE Official Account documentation
- [ ] Tests for LINE webhook

---

## 4. E-Commerce Integrations (Weeks 22-24, 10 days of effort)

### Objective
Integrate with major Thai e-commerce platforms to purchase directly from Pixie.

### Supported Integrations

| Platform | Use Case | Difficulty |
|----------|----------|-----------|
| GrabMart | Same-day delivery groceries | Medium |
| LINE MAN | Convenience store delivery | Medium |
| Shopee | Bulk purchases, lower prices | Medium |
| BigC Online | Supermarket delivery | Medium |

### Implementation Example: GrabMart

```typescript
// packages/core/src/integrations/grabmart.ts
import axios from 'axios';

export interface GrabMartConfig {
  apiKey: string;
  partnerToken: string;
}

export class GrabMartConnector {
  constructor(private config: GrabMartConfig) {}

  async searchProducts(query: string): Promise<GrabMartProduct[]> {
    const response = await axios.get('https://api.grab.com/grabmart/search', {
      headers: {
        'Authorization': `Bearer ${this.config.partnerToken}`,
      },
      params: { q: query },
    });

    return response.data.products;
  }

  async createOrder(items: { productId: string; quantity: number }[]): Promise<GrabMartOrder> {
    const response = await axios.post('https://api.grab.com/grabmart/orders', {
      items,
      deliveryLocation: { lat: 13.736717, lng: 100.523186 }, // Bangkok
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.partnerToken}`,
      },
    });

    return response.data;
  }

  async trackOrder(orderId: string): Promise<GrabMartOrderStatus> {
    const response = await axios.get(`https://api.grab.com/grabmart/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.partnerToken}`,
      },
    });

    return response.data;
  }
}

// Integration with Pixie
export async function pixieOrderFromGrabMart(
  homeId: string,
  itemNames: string[]
) {
  const grabmart = new GrabMartConnector({
    apiKey: process.env.GRABMART_API_KEY,
    partnerToken: process.env.GRABMART_PARTNER_TOKEN,
  });

  // Search for items
  const products: Record<string, GrabMartProduct> = {};
  for (const name of itemNames) {
    const results = await grabmart.searchProducts(name);
    if (results.length > 0) {
      products[name] = results[0]; // Take first result
    }
  }

  // Create order
  const order = await grabmart.createOrder(
    Object.entries(products).map(([name, product]) => ({
      productId: product.id,
      quantity: 1,
    }))
  );

  // Save order record
  const orderRecord = await db.insert(integratedOrders).values({
    homeId,
    provider: 'grabmart',
    providerId: order.id,
    items: Object.entries(products).map(([name, product]) => ({
      name,
      productId: product.id,
      price: product.price,
    })),
    totalPrice: order.totalPrice,
    status: order.status,
  }).returning();

  return orderRecord[0];
}
```

### Shopping Flow

```
1. User: "Add eggs, milk, bread from GrabMart"
2. Pixie: "Found 3 items on GrabMart. ฿{total}. Ready to order?"
3. User: "Yes"
4. Order placed → Pixie tracks → Notification when delivered
5. Mark as purchased automatically
```

### API Endpoints

```typescript
// GET /homes/:homeId/integrations/available
// Returns: { grabmart: true, shopee: true, line-man: true, ... }

// POST /homes/:homeId/integrations/:provider/search
// Query: { items: ['eggs', 'milk'] }
// Returns: { items: { eggs: [{product}, ...], milk: [...] } }

// POST /homes/:homeId/integrations/:provider/order
// Body: { items: { productId: 'xxx', quantity: 1 }, ... }
// Returns: { orderId, total, status }

// GET /homes/:homeId/integrations/:provider/orders/:orderId
// Returns: { status, trackingUrl, deliveryEta }
```

### Frontend Integration

```typescript
// packages/web/src/components/QuickOrderButton.tsx
export function QuickOrderButton({ homeId, listId }: { homeId: string; listId: string }) {
  const [provider, setProvider] = React.useState<'grabmart' | 'shopee' | 'line-man'>('grabmart');
  const [loading, setLoading] = React.useState(false);

  const handleOrder = async () => {
    setLoading(true);
    try {
      // Get current list items
      const response = await fetch(`/api/homes/${homeId}/lists/${listId}`);
      const list = await response.json();

      // Search for items on provider
      const searchResponse = await fetch(
        `/api/homes/${homeId}/integrations/${provider}/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: list.items.map((i: any) => i.name),
          }),
        }
      );

      const { items } = await searchResponse.json();

      // Show preview and confirm
      // Then place order
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as any)}
        className="px-3 py-2 border border-neutral-200 rounded-lg"
      >
        <option value="grabmart">GrabMart</option>
        <option value="shopee">Shopee</option>
        <option value="line-man">LINE MAN</option>
      </select>
      <Button onClick={handleOrder} disabled={loading}>
        {loading ? 'Ordering...' : `Order via ${provider}`}
      </Button>
    </div>
  );
}
```

### Deliverables

- [ ] GrabMart integration (OAuth, search, order)
- [ ] Shopee integration (API wrapper)
- [ ] LINE MAN integration
- [ ] Order tracking
- [ ] Webhook for order status updates
- [ ] Frontend quick-order UI
- [ ] Tests for each integration

---

## 5. Multi-Language Support (Weeks 23-24, 6 days of effort)

### Objective
Support Thai and English (with framework for future languages).

### Implementation

```typescript
// packages/core/src/i18n/translations.ts
export const translations = {
  en: {
    greeting: 'Hello! I\'m Pixie.',
    listCreated: 'Created a new list.',
    itemAdded: 'Added {{itemName}} to the list.',
    weeklySync: 'Ready for your weekly sync?',
  },
  th: {
    greeting: 'สวัสดี ฉันคือ Pixie',
    listCreated: 'สร้างรายการใหม่แล้ว',
    itemAdded: 'เพิ่ม {{itemName}} ในรายการแล้ว',
    weeklySync: 'พร้อมสำหรับการซิงค์รายสัปดาห์หรือยัง',
  },
};

export function t(key: string, lang: string, params?: Record<string, string>): string {
  const text = translations[lang as keyof typeof translations]?.[key as any] || translations.en[key as any];

  if (params) {
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(`{{${k}}}`, v),
      text
    );
  }

  return text;
}
```

### Frontend Integration

```typescript
// packages/web/src/hooks/useI18n.ts
export function useI18n() {
  const [language, setLanguage] = React.useState<'en' | 'th'>('en');

  React.useEffect(() => {
    const saved = localStorage.getItem('language') as 'en' | 'th' | null;
    if (saved) {
      setLanguage(saved);
    } else {
      // Detect from browser
      const browserLang = navigator.language;
      if (browserLang.startsWith('th')) {
        setLanguage('th');
      }
    }
  }, []);

  const translate = (key: string, params?: Record<string, string>) => {
    return t(key, language, params);
  };

  return { language, setLanguage, translate };
}

// Usage:
export function ChatMessage({ message }: { message: string }) {
  const { translate } = useI18n();
  return <div>{translate('itemAdded', { itemName: message })}</div>;
}
```

### Language Selection

```typescript
// packages/web/src/components/LanguageSelector.tsx
export function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  return (
    <select
      value={language}
      onChange={(e) => {
        const lang = e.target.value as 'en' | 'th';
        setLanguage(lang);
        localStorage.setItem('language', lang);
      }}
      className="px-3 py-2 border border-neutral-200 rounded-lg"
    >
      <option value="en">English</option>
      <option value="th">ไทย</option>
    </select>
  );
}
```

### Pixie Language Support

```typescript
// Pixie responds in user's preferred language
export async function buildPixieSystemPromptWithLanguage(homeId: string, language: string) {
  const basePrompt = await buildPixieSystemPrompt(homeId);

  const languageInstruction = {
    en: 'Respond in English unless the user explicitly writes in Thai.',
    th: 'ตอบในภาษาไทยเสมอ เว้นแต่ผู้ใช้พิมพ์เป็นภาษาอังกฤษ',
  };

  return `${basePrompt}\n\n${languageInstruction[language as keyof typeof languageInstruction]}`;
}
```

### Deliverables

- [ ] Translation system (i18n)
- [ ] English + Thai translations for all UI text
- [ ] Pixie responses in selected language
- [ ] Language preference persistence
- [ ] Browser language detection
- [ ] Language settings in UI
- [ ] Tests for translation keys

---

## 6. Community & Plugin System (Weeks 24-25, 7 days of effort)

### Objective
Enable community contributions and third-party extensions.

### Plugin Architecture

```typescript
// packages/core/src/plugin/types.ts
export interface PixiePlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: {
    onItemAdded?: (item: Item) => Promise<void>;
    onListCompleted?: (list: GroceryList) => Promise<void>;
    onChatMessage?: (message: ChatMessage) => Promise<void>;
  };
  api?: {
    // Custom endpoints registered
    routes: Array<{
      method: string;
      path: string;
      handler: (params: any) => Promise<any>;
    }>;
  };
}
```

### Plugin Registry

```typescript
// packages/core/src/plugin/registry.ts
export class PluginRegistry {
  private plugins: Map<string, PixiePlugin> = new Map();

  async loadPlugin(plugin: PixiePlugin) {
    this.plugins.set(plugin.name, plugin);
    console.log(`Loaded plugin: ${plugin.name}`);
  }

  async unloadPlugin(name: string) {
    this.plugins.delete(name);
  }

  async triggerHook(hookName: string, payload: any) {
    for (const plugin of this.plugins.values()) {
      const hook = plugin.hooks?.[hookName as any];
      if (hook) {
        try {
          await hook(payload);
        } catch (error) {
          console.error(`Plugin hook failed: ${plugin.name}/${hookName}`, error);
        }
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
```

### Example Plugin: Meal Planning

```typescript
// community-plugins/meal-planner/plugin.ts
import { PixiePlugin, GroceryList } from '@pantry-pixie/core';

const mealPlannerPlugin: PixiePlugin = {
  name: 'meal-planner',
  version: '1.0.0',
  description: 'Suggests meals based on available ingredients',
  author: 'Community',
  hooks: {
    onListCompleted: async (list) => {
      // Suggest meals for next week
      const meals = await suggestMealsForIngredients(list.items);
      // Notify user
    },
  },
  api: {
    routes: [
      {
        method: 'GET',
        path: '/meal-suggestions/:homeId',
        handler: async (params) => {
          return await getMealSuggestions(params.homeId);
        },
      },
    ],
  },
};

export default mealPlannerPlugin;
```

### Plugin Marketplace

```markdown
# Pantry Pixie Plugin Marketplace

## Featured Plugins

### Meal Planner
Suggests meals based on ingredients in your list.
[View on GitHub](https://github.com/pantry-pixie/plugins/meal-planner)

### Recipe Integration
Links grocery items to recipes on popular cooking sites.

### Price Comparison
Compares prices across stores for better deals.

### Nutrition Tracker
Logs nutritional content of purchases.

---

## Develop Your Own Plugin

[Plugin Development Guide](../docs/plugin-development.md)
```

### Community Forum

```
https://forum.pantry-pixie.app/
- Feature requests
- Plugin discussions
- Best practices
- Troubleshooting
```

### Deliverables

- [ ] Plugin API and types
- [ ] Plugin registry and lifecycle management
- [ ] Hook system (onItemAdded, onListCompleted, etc.)
- [ ] Custom route registration
- [ ] Example meal-planner plugin
- [ ] Plugin development guide
- [ ] Plugin marketplace (directory)
- [ ] Community forum/discussions
- [ ] Security sandbox (Phase 4+)

---

## 7. Value-Add Tier Design (Week 25, 5 days of effort)

### Objective
Design a sustainable monetization model through premium features.

### Freemium Model

```
FREE TIER
├─ Grocery lists (unlimited)
├─ Chat with Pixie
├─ Basic recurring items
├─ Web + PWA
├─ Basic insights (spending)
└─ 1 home, 2 members

PREMIUM ($3/month or $30/year)
├─ Everything in Free
├─ Advanced analytics
│  ├─ Spending trends
│  ├─ Seasonal predictions
│  └─ Category breakdown
├─ Multi-store recommendations
├─ E-commerce integration
│  ├─ GrabMart
│  ├─ Shopee
│  └─ LINE MAN
├─ Priority support
├─ Unlimited homes
└─ Custom notifications

FAMILY PLAN ($5/month, 4 homes)
└─ Everything in Premium for multiple households
```

### Feature Paywalls

```typescript
// packages/core/src/services/feature-gates.ts
export enum FeatureFlag {
  ADVANCED_ANALYTICS = 'advanced_analytics',
  ECOMMERCE_ORDERS = 'ecommerce_orders',
  MULTISTORE_RECOMMENDATIONS = 'multistore_recommendations',
  PREMIUM_SUPPORT = 'premium_support',
}

export async function checkFeatureAccess(
  homeId: string,
  feature: FeatureFlag
): Promise<boolean> {
  const home = await db.query.homes.findFirst({
    where: eq(homes.id, homeId),
  });

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.homeId, homeId),
  });

  // Free tier has basic features
  const freeFeatures = ['basic_analytics', 'grocery_lists', 'chat'];
  if (freeFeatures.includes(feature)) return true;

  // Premium required for rest
  return subscription?.status === 'active' && subscription?.tier === 'premium';
}

// API middleware
export function requireFeature(feature: FeatureFlag) {
  return async (ctx: any) => {
    const homeId = ctx.params.homeId;
    const hasAccess = await checkFeatureAccess(homeId, feature);

    if (!hasAccess) {
      return ctx.json(
        {
          error: 'Feature not available',
          feature,
          message: 'Upgrade to Premium to unlock this feature',
          upgradeUrl: 'https://pantry-pixie.app/upgrade',
        },
        { status: 403 }
      );
    }
  };
}
```

### Pricing Page

```
┌─────────────────────────────────────────┐
│          Pantry Pixie Pricing           │
├─────────────────────────────────────────┤
│                                         │
│  FREE          PREMIUM      FAMILY      │
│  ────────────────────────────────────   │
│  $0/month      $3/month     $5/month    │
│                                         │
│  Grocery       + Everything    + 4 homes│
│  Lists         in Free         coverage │
│  Chat          + Analytics              │
│  Basic         + E-commerce             │
│  Insights      + Integrations           │
│  PWA           + Support                │
│  1 Home                                 │
│                                         │
│  [Start Free]  [Upgrade]     [Try Family]
│                                         │
└─────────────────────────────────────────┘
```

### Subscription Management

```typescript
// packages/core/src/services/subscriptions.ts
export async function createPremiumSubscription(
  homeId: string,
  tier: 'premium' | 'family',
  paymentMethod: string // Stripe, Omise, etc.
) {
  // Create Stripe/Omise customer
  const paymentCustomer = await createPaymentCustomer(homeId);

  // Subscribe user
  const subscription = await db.insert(premiumSubscriptions).values({
    homeId,
    tier,
    paymentCustomerId: paymentCustomer.id,
    status: 'active',
    startsAt: new Date(),
    endsAt: addMonths(new Date(), 1),
  }).returning();

  return subscription[0];
}

export async function cancelSubscription(subscriptionId: string) {
  const sub = await db
    .update(premiumSubscriptions)
    .set({ status: 'cancelled', endsAt: new Date() })
    .where(eq(premiumSubscriptions.id, subscriptionId))
    .returning();

  return sub[0];
}
```

### Deliverables

- [ ] Freemium tier definition (features)
- [ ] Feature gates and checks
- [ ] Subscription creation and cancellation
- [ ] Pricing page design
- [ ] Stripe/Omise integration
- [ ] Upgrade prompts in UI
- [ ] Premium badge display
- [ ] Usage tracking for analytics

---

## 8. Rebranding: From "Pantry" to "Pixie" (Week 26, 3 days of effort)

### Objective
Emphasize Pixie as the brand, expand beyond just pantry/grocery.

### Messaging Shift

```
Before: "Pantry Pixie – Household Grocery Coordinator"
After:  "Pixie – Your AI Home Steward"
```

### Marketing

- Logo: Pixie sprite icon (simplified, memorable)
- Tagline: "Let Pixie handle the household details"
- Vision: "From groceries to bills, Pixie knows your home"

### Website Updates

```
Homepage:
┌──────────────────────────────────────┐
│  🍃 PIXIE                            │
│  Your AI Home Steward               │
├──────────────────────────────────────┤
│  Groceries • Bills • Supplies        │
│  All in one place                    │
│                                      │
│  [Get Started] [Learn More]         │
└──────────────────────────────────────┘
```

### Deliverables

- [ ] Refreshed branding (logo, colors, fonts)
- [ ] Website redesign
- [ ] Updated app UI
- [ ] Marketing materials
- [ ] Press release
- [ ] Announcement blog post

---

## Phase 4 Acceptance Criteria (Hard Gate)

All must be true for Phase 4 completion:

### 1. Subscriptions & Supplies
- [ ] Track subscriptions and supplies
- [ ] Bill reminders sent correctly
- [ ] Pixie understands subscriptions

### 2. Bills & Utilities
- [ ] Bill due dates calculated
- [ ] Payment history tracked
- [ ] Notifications sent 3 days before

### 3. LINE Integration
- [ ] LINE Official Account operational
- [ ] Messages send/receive correctly
- [ ] Rich menu functional

### 4. E-Commerce
- [ ] At least 1 integration live (GrabMart)
- [ ] Orders placed successfully
- [ ] Order tracking works

### 5. Multi-Language
- [ ] Thai + English UI complete
- [ ] Pixie responds in both languages
- [ ] Language preference persisted

### 6. Community
- [ ] Plugin API stable
- [ ] 1+ community plugins submitted
- [ ] Forum/discussions active

### 7. Monetization
- [ ] Pricing tiers defined
- [ ] Subscription payments working
- [ ] Feature gates enforced
- [ ] >$5K monthly revenue

### 8. Metrics
- [ ] 10K+ monthly active users
- [ ] 5+ integration partnerships
- [ ] 20%+ freemium-to-premium conversion
- [ ] <1% churn rate (premium)

---

## Success Metrics for Phase 4

| Metric | Target | Owner |
|--------|--------|-------|
| Monthly Active Users | 10K+ | Growth Lead |
| Premium Revenue | $5K+/month | Business Lead |
| Freemium Conversion | 20%+ | Product Lead |
| Integration Partners | 5+ | Partnerships Lead |
| Plugin Submissions | 5+ | Community Lead |
| User Satisfaction (NPS) | >50 | UX Researcher |
| Feature Adoption (Premium) | >60% | Product Analytics |

---

## Timeline Breakdown

| Week | Focus | Deliverables |
|------|-------|------------|
| 19-21 | Subscriptions + Bills | Tracking, reminders, Pixie integration |
| 21-23 | LINE + E-Commerce | LINE Official Account, GrabMart |
| 23-24 | Multi-Language | Thai/English, i18n system |
| 24-25 | Community + Plugins | Plugin registry, example plugins |
| 25 | Monetization | Pricing, subscriptions, feature gates |
| 26 | Rebranding | Marketing, website, announcement |

---

## Post-Phase-4: Future Roadmap

### Phase 5: Advanced Home Management
- Energy usage tracking
- Household chore scheduling
- Inventory management (all household items)
- Meal planning (advanced)
- Recipe integration

### Phase 6: AI Personalization
- ML-based personalization per household
- Predictive shopping lists
- Anomaly detection (unusual spending)
- Smart budgeting recommendations

### Phase 7: Marketplace
- Peer-to-peer item sharing
- Recipe sharing with ingredients
- Community shopping tips
- Referral program

---

**Phase 4 Status:** Ready to Begin
**Estimated Effort:** 35 person-days
**Team Size:** 2-3 full-stack engineers, 1 DevOps, 1 Product Manager

---

## Appendix: Monetization Strategy

### Revenue Sources (Projected)

| Source | Year 1 Target | Growth |
|--------|---------------|--------|
| Premium Subscriptions | $60K | +200% Y2 |
| Family Plans | $20K | +150% Y2 |
| Integration Revenue Share | $5K | +300% Y2 |
| **Total** | **$85K** | **+183% avg** |

### Cost Structure (Estimated Annual)

| Item | Cost |
|------|------|
| Infrastructure (Postgres, servers) | $12K |
| API Costs (LINE, Stripe, integrations) | $8K |
| Support & Hosting | $10K |
| Marketing | $15K |
| Team (2-3 people) | $40K |
| **Total** | **$85K** |

**Break-even target: Year 1 (optimistic), Year 2 (realistic)**

---

**Final Note:**

Pantry Pixie's journey from a grocery coordinator to a household steward demonstrates how focusing on one core problem (grocery coordination) and solving it exceptionally well can be the foundation for a platform. The key is maintaining the open-source core while building sustainable premium features that provide genuine value.

The path: Simple + Focused → Learning + Intelligence → Expansion → Monetization → Platform.
