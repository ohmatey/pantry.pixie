# Phase 3: Intelligence Layer (Weeks 13-18)

## Overview

Phase 3 adds predictive and adaptive capabilities to Pantry Pixie. By analyzing real purchase history and household patterns, Pixie becomes smarter about suggesting items, predicting depletion, and providing personalized insights. This phase also enhances Pixie's personality and contextual awareness.

**Duration:** 6 weeks
**Goal:** Deploy a learning system that predicts household needs and reduces friction in list creation
**Success Criteria:** 70%+ accuracy on recurring item predictions; 80%+ user satisfaction with suggestions; 20%+ freemium-to-premium conversion

---

## 1. Purchase Pattern Learning (Weeks 13-15, 8 days of effort)

### Objective
Analyze completed lists to identify what items are purchased regularly and at what frequency.

### Data Model

```typescript
// packages/core/src/entities/purchases.ts
export interface PurchaseEvent {
  id: string;
  homeId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  purchasedAt: Date;
  purchasedBy: string;  // User ID
  price?: number;
  category?: string;
  notes?: string;
}

// Derived: frequency statistics per item
export interface ItemFrequencyStats {
  itemId: string;
  itemName: string;
  homeId: string;

  // Time between purchases
  averageDaysBetweenPurchases: number;
  medianDaysBetweenPurchases: number;
  minDaysBetweenPurchases: number;
  maxDaysBetweenPurchases: number;
  standardDeviation: number;

  // Quantity patterns
  averageQuantity: number;
  medianQuantity: number;
  mostCommonUnit: string;

  // Temporal patterns
  purchasesInLastMonth: number;
  purchasesInLast3Months: number;
  lastPurchasedAt: Date;
  nextPredictedAt: Date;

  // Confidence
  dataPoints: number;
  confidence: number; // 0-1; based on consistency and sample size
}
```

### Depletion Prediction Algorithm

```typescript
// packages/core/src/services/depletion-predictor.ts
import * as math from 'simple-statistics';

export async function predictItemDepletion(
  homeId: string,
  itemId: string
): Promise<{
  itemId: string;
  predictedDepletionDate: Date;
  confidence: number;
  reasoning: string;
}> {
  // 1. Get purchase history for this item
  const purchases = await db
    .select()
    .from(purchaseEvents)
    .where(
      and(
        eq(purchaseEvents.homeId, homeId),
        eq(purchaseEvents.itemId, itemId)
      )
    )
    .orderBy(desc(purchaseEvents.purchasedAt))
    .limit(50); // Last 50 purchases

  if (purchases.length < 3) {
    // Not enough data
    return {
      itemId,
      predictedDepletionDate: addDays(new Date(), 7), // Default guess
      confidence: 0.3,
      reasoning: 'Insufficient purchase history',
    };
  }

  // 2. Calculate intervals between purchases
  const intervals: number[] = [];
  for (let i = 0; i < purchases.length - 1; i++) {
    const daysBetween = daysBetweenDates(purchases[i].purchasedAt, purchases[i + 1].purchasedAt);
    intervals.push(daysBetween);
  }

  // 3. Calculate statistics
  const avgInterval = math.mean(intervals);
  const stdDev = math.standardDeviation(intervals);
  const median = math.median(intervals);

  // Use median for robustness (less affected by outliers)
  const estimatedInterval = median || avgInterval;

  // 4. Calculate confidence based on consistency
  const coefficientOfVariation = stdDev / avgInterval;
  let confidence = 1 - Math.min(coefficientOfVariation, 1);
  if (purchases.length < 10) {
    confidence *= (purchases.length / 10); // Lower confidence for small sample
  }

  // 5. Predict next depletion
  const lastPurchase = new Date(purchases[0].purchasedAt);
  const predictedDepletion = addDays(lastPurchase, estimatedInterval);

  // 6. Generate reasoning
  const reasoning = `Based on ${purchases.length} purchases over ${intervalInDays(purchases[purchases.length - 1].purchasedAt, lastPurchase)} days. Average interval: ${Math.round(estimatedInterval)} days.`;

  return {
    itemId,
    predictedDepletionDate: predictedDepletion,
    confidence,
    reasoning,
  };
}

// Helper: predict depletion for all items in a home
export async function predictAllDepletions(homeId: string) {
  const items = await db
    .select()
    .from(items as any)
    .where(eq(items.homeId, homeId));

  const predictions = await Promise.all(
    items.map((item) => predictItemDepletion(homeId, item.id))
  );

  return predictions.sort(
    (a, b) => a.predictedDepletionDate.getTime() - b.predictedDepletionDate.getTime()
  );
}
```

### Purchase Event Tracking

```typescript
// packages/core/src/services/purchase-tracker.ts
// When a list is marked as "completed", create purchase events

export async function createPurchaseEvents(
  homeId: string,
  listId: string
) {
  const list = await db.query.groceryLists.findFirst({
    where: (l) => eq(l.id, listId),
  });

  if (list.state !== 'completed') {
    throw new Error('List must be completed to create purchase events');
  }

  const listItems = await db
    .select()
    .from(listItems as any)
    .innerJoin(items as any, eq(listItems.itemId, items.id))
    .where(
      and(
        eq(listItems.listId, listId),
        eq(listItems.state, 'purchased')
      )
    );

  const events = await db.insert(purchaseEvents).values(
    listItems.map((row) => ({
      homeId,
      itemId: row.items.id,
      itemName: row.items.name,
      quantity: row.listItems.quantity,
      unit: row.listItems.unit,
      purchasedAt: row.listItems.purchasedAt,
      purchasedBy: row.listItems.purchasedBy,
      price: row.items.estimatedPrice,
      category: row.items.category,
    }))
  );

  // Invalidate predictions cache
  await cache.del(`predictions:${homeId}`);

  return events;
}
```

### API Endpoints

```typescript
// GET /homes/:homeId/predictions
// Returns predicted depletion for next 7, 30, 90 days

app.get('/homes/:homeId/predictions', async (ctx) => {
  const { homeId } = ctx.params;
  const period = ctx.query.period || 7; // days

  try {
    const predictions = await predictAllDepletions(homeId);
    const cutoff = addDays(new Date(), period);

    const filtered = predictions.filter(
      (p) => p.predictedDepletionDate <= cutoff
    );

    return ctx.json({
      predictions: filtered,
      period,
      generatedAt: new Date(),
    });
  } catch (error) {
    return ctx.json({ error: error.message }, { status: 500 });
  }
});

// GET /homes/:homeId/items/:itemId/stats
// Returns frequency statistics for an item

app.get('/homes/:homeId/items/:itemId/stats', async (ctx) => {
  const { homeId, itemId } = ctx.params;

  try {
    const purchases = await db
      .select()
      .from(purchaseEvents)
      .where(
        and(
          eq(purchaseEvents.homeId, homeId),
          eq(purchaseEvents.itemId, itemId)
        )
      )
      .orderBy(desc(purchaseEvents.purchasedAt));

    const stats = calculateFrequencyStats(purchases);

    return ctx.json(stats);
  } catch (error) {
    return ctx.json({ error: error.message }, { status: 500 });
  }
});
```

### Deliverables

- [ ] `purchaseEvents` table with purchase history
- [ ] `depletion-predictor.ts` service with prediction algorithm
- [ ] `purchase-tracker.ts` service to log purchases
- [ ] Caching layer for predictions (Redis or in-memory)
- [ ] `/homes/:homeId/predictions` endpoint
- [ ] `/homes/:homeId/items/:itemId/stats` endpoint
- [ ] Unit tests for prediction accuracy
- [ ] Data migration to backfill purchase history from completed lists

### Acceptance Criteria
```
1. Prediction accuracy: 70%+ for frequently purchased items
2. Prediction confidence: >0.8 for items with >10 purchases
3. Handles outliers: Single large purchase doesn't skew interval
4. API response time: <500ms even with 1000+ purchase events
5. Caching: Predictions cached for 1 hour before recompute
```

---

## 2. Smart Recurring Suggestions (Weeks 14-15, 5 days of effort)

### Objective
Automatically suggest items to add based on predicted depletion; optionally set up recurring patterns.

### Suggestion Engine

```typescript
// packages/core/src/services/suggestion-engine.ts
export interface ItemSuggestion {
  itemId: string;
  itemName: string;
  reason: 'high_confidence_recurring' | 'due_soon' | 'pattern_based' | 'seasonal';
  confidence: number;
  suggestedQuantity: number;
  suggestedUnit: string;
  predictedDepletionDate?: Date;
}

export async function generateSuggestions(
  homeId: string
): Promise<ItemSuggestion[]> {
  const suggestions: ItemSuggestion[] = [];

  // 1. Get predictions
  const predictions = await predictAllDepletions(homeId);

  // 2. Filter to items due within 7 days
  const upcomingDepletes = predictions.filter(
    (p) =>
      p.confidence > 0.7 &&
      p.predictedDepletionDate <= addDays(new Date(), 7)
  );

  // 3. Check if already in draft list
  const draftList = await db.query.groceryLists.findFirst({
    where: (l) => and(eq(l.homeId, homeId), eq(l.state, 'draft')),
  });

  let draftItemIds: string[] = [];
  if (draftList) {
    const draftItems = await db
      .select({ itemId: listItems.itemId })
      .from(listItems)
      .where(eq(listItems.listId, draftList.id));
    draftItemIds = draftItems.map((r) => r.itemId);
  }

  // 4. Create suggestions
  upcomingDepletes.forEach((pred) => {
    if (!draftItemIds.includes(pred.itemId)) {
      suggestions.push({
        itemId: pred.itemId,
        itemName: pred.itemName,
        reason: pred.confidence > 0.85 ? 'high_confidence_recurring' : 'due_soon',
        confidence: pred.confidence,
        suggestedQuantity: 1, // TODO: Use historical average
        suggestedUnit: 'pack', // TODO: Use most common unit
        predictedDepletionDate: pred.predictedDepletionDate,
      });
    }
  });

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// Pixie proactively suggests items
export async function generatePixieSuggestion(homeId: string) {
  const suggestions = await generateSuggestions(homeId);

  if (suggestions.length === 0) {
    return null;
  }

  const top = suggestions[0];
  const templates = [
    `Looks like we're running low on ${top.itemName}. Should I add it?`,
    `Time to restock ${top.itemName}?`,
    `I notice you usually grab ${top.itemName} around now. Ready to add it?`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}
```

### Recurring Item Setup

```typescript
// packages/core/src/services/recurring-items.ts
export interface RecurringItemConfig {
  id: string;
  homeId: string;
  itemId: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  customIntervalDays?: number;
  quantity: number;
  unit: string;
  nextDueAt: Date;
  lastAddedAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export async function createRecurringItem(
  homeId: string,
  itemId: string,
  frequency: string
) {
  const frequencyDays: Record<string, number> = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
  };

  const days = frequencyDays[frequency] || 7;
  const nextDue = addDays(new Date(), days);

  const recurring = await db.insert(recurringItems).values({
    homeId,
    itemId,
    frequency,
    nextDueAt: nextDue,
    isActive: true,
  }).returning();

  return recurring;
}

// Cron job: once per day, check recurring items and suggest/add
export async function processRecurringItems() {
  const now = new Date();

  const due = await db
    .select()
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.isActive, true),
        lte(recurringItems.nextDueAt, now)
      )
    );

  for (const recurring of due) {
    // Get or create draft list
    let list = await db.query.groceryLists.findFirst({
      where: (l) =>
        and(eq(l.homeId, recurring.homeId), eq(l.state, 'draft')),
    });

    if (!list) {
      list = await db.insert(groceryLists).values({
        homeId: recurring.homeId,
        state: 'draft',
      }).returning();
    }

    // Add item to list
    await db.insert(listItems).values({
      listId: list.id,
      itemId: recurring.itemId,
      state: 'pending',
      addedBy: 'recurring_system',
    });

    // Schedule next occurrence
    const frequencyDays: Record<string, number> = {
      weekly: 7,
      biweekly: 14,
      monthly: 30,
    };

    const days = frequencyDays[recurring.frequency] || 7;
    const nextDue = addDays(now, days);

    await db
      .update(recurringItems)
      .set({ nextDueAt: nextDue, lastAddedAt: now })
      .where(eq(recurringItems.id, recurring.id));
  }
}
```

### API Endpoints

```typescript
// GET /homes/:homeId/suggestions
app.get('/homes/:homeId/suggestions', async (ctx) => {
  const suggestions = await generateSuggestions(ctx.params.homeId);
  return ctx.json({ suggestions });
});

// POST /homes/:homeId/recurring
app.post('/homes/:homeId/recurring', async (ctx) => {
  const { itemId, frequency } = await ctx.req.json();
  const recurring = await createRecurringItem(ctx.params.homeId, itemId, frequency);
  return ctx.json(recurring);
});

// GET /homes/:homeId/recurring
app.get('/homes/:homeId/recurring', async (ctx) => {
  const items = await db
    .select()
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.homeId, ctx.params.homeId),
        eq(recurringItems.isActive, true)
      )
    );
  return ctx.json(items);
});

// PATCH /homes/:homeId/recurring/:id
app.patch('/homes/:homeId/recurring/:id', async (ctx) => {
  const { frequency, isActive } = await ctx.req.json();
  const updated = await db
    .update(recurringItems)
    .set({ frequency, isActive })
    .where(eq(recurringItems.id, ctx.params.id))
    .returning();
  return ctx.json(updated[0]);
});
```

### Frontend Integration

```typescript
// packages/web/src/components/SuggestionsPanel.tsx
export function SuggestionsPanel({ homeId }: { homeId: string }) {
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
  });

  const { suggestions } = suggestionsQuery.data || {};

  if (!suggestions?.length) return null;

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <p className="font-medium mb-3">✨ Pixie's Suggestions</p>
      {suggestions.map((s) => (
        <div key={s.itemId} className="mb-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-left justify-between"
            onClick={() => addItemToList(s.itemId, s.suggestedQuantity)}
          >
            <span>{s.itemName}</span>
            <span className="text-xs opacity-70">{(s.confidence * 100).toFixed(0)}%</span>
          </Button>
        </div>
      ))}
    </div>
  );
}

// Recurring items list
export function RecurringItemsList({ homeId }: { homeId: string }) {
  const recurringQuery = useQuery({
    queryKey: ['recurring', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/recurring`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
  });

  return (
    <div className="space-y-2">
      {recurringQuery.data?.map((item: any) => (
        <div
          key={item.id}
          className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between"
        >
          <div>
            <p className="font-medium">{item.item.name}</p>
            <p className="text-sm text-neutral-500 capitalize">{item.frequency}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRecurring(item.id, !item.isActive)}
          >
            {item.isActive ? 'On' : 'Off'}
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### Deliverables

- [ ] Suggestion engine based on predictions
- [ ] Recurring items table and management
- [ ] Cron job to process recurring items
- [ ] `/homes/:homeId/suggestions` endpoint
- [ ] `/homes/:homeId/recurring` endpoints
- [ ] Frontend suggestions panel
- [ ] Recurring items UI in settings
- [ ] Tests for suggestion logic

---

## 3. Seasonal Awareness (Week 15, 3 days of effort)

### Objective
Understand seasonal patterns (monsoon season, holiday prep, etc.) relevant to Bangkok context.

### Implementation

```typescript
// packages/core/src/services/seasonal-awareness.ts
export interface Season {
  name: string;
  startMonth: number; // 1-12
  endMonth: number;
  description: string;
  typicalItems: string[]; // Common purchases during this season
}

const THAILAND_SEASONS: Season[] = [
  {
    name: 'Rainy Season',
    startMonth: 5,
    endMonth: 10,
    description: 'High humidity, frequent rain',
    typicalItems: ['dehumidifier', 'canned goods', 'preserved items', 'umbrellas'],
  },
  {
    name: 'Hot Season',
    startMonth: 3,
    endMonth: 5,
    description: 'Extreme heat (40°C+)',
    typicalItems: ['water bottles', 'sports drinks', 'ice', 'cooling herbs'],
  },
  {
    name: 'Cool Season',
    startMonth: 11,
    endMonth: 2,
    description: 'Cooler, dry weather',
    typicalItems: ['outdoor entertaining items', 'fresh produce'],
  },
  {
    name: 'New Year / Songkran',
    startMonth: 4,
    endMonth: 4,
    description: 'Thai New Year celebration',
    typicalItems: ['fresh flowers', 'special foods', 'beverages', 'party supplies'],
  },
];

export function getCurrentSeason(): Season {
  const now = new Date();
  const month = now.getMonth() + 1; // JavaScript months are 0-11

  return (
    THAILAND_SEASONS.find((s) => month >= s.startMonth && month <= s.endMonth) ||
    THAILAND_SEASONS[0]
  );
}

// Enhance suggestions with seasonal awareness
export async function generateSeasonalSuggestions(
  homeId: string
): Promise<ItemSuggestion[]> {
  const baseSuggestions = await generateSuggestions(homeId);
  const season = getCurrentSeason();

  // If a seasonal item is commonly purchased in this home, boost its relevance
  const seasonalBoost = baseSuggestions.map((s) => {
    if (season.typicalItems.some((si) => s.itemName.toLowerCase().includes(si))) {
      return { ...s, confidence: Math.min(s.confidence + 0.1, 1.0) };
    }
    return s;
  });

  // Add seasonal items that fit the current season
  // (This would require tracking seasonal purchase patterns in a separate table)

  return seasonalBoost.sort((a, b) => b.confidence - a.confidence);
}

// Pixie seasonal comment
export async function generateSeasonalInsight(homeId: string): Promise<string | null> {
  const season = getCurrentSeason();
  const insights: Record<string, string[]> = {
    'Rainy Season': [
      `Rainy season's here! Might want to stock up on shelf-stable items.`,
      `With the monsoons, good time to get preserved foods and emergency supplies.`,
    ],
    'Hot Season': [
      `It's getting sweltering. Time for hydration and cooling foods?`,
      `Peak heat season—plenty of ice and cold drinks needed?`,
    ],
    'Cool Season': [
      `Beautiful cool weather—perfect for fresh market visits!`,
      `Cooler days mean fresh produce is in season.`,
    ],
    'New Year / Songkran': [
      `Songkran's coming! Need special items for the celebration?`,
      `New Year prep time! Ready to refresh the pantry?`,
    ],
  };

  const options = insights[season.name] || [];
  return options[Math.floor(Math.random() * options.length)] || null;
}
```

### Deliverables

- [ ] Seasonal calendar for Bangkok (hardcoded or config)
- [ ] `getCurrentSeason()` function
- [ ] Seasonal boost to suggestion engine
- [ ] Seasonal insights in Pixie responses
- [ ] Seasonal item tracking (optional Phase 3+)

---

## 4. Multi-Store Awareness (Week 16, 3 days of effort)

### Objective
Remember where items are typically purchased (different items from different stores in Bangkok).

### Data Model

```typescript
// packages/core/src/entities/stores.ts
export interface Store {
  id: string;
  homeId: string;
  name: string;
  type: 'supermarket' | 'market' | 'convenience' | 'specialty' | 'online';
  location?: string;
  notes?: string;
  createdAt: Date;
}

export interface ItemStore {
  id: string;
  itemId: string;
  storeId: string;
  isPreferred: boolean;
  estimatedPrice?: number;
  lastPurchasedAt?: Date;
}
```

### Implementation

```typescript
// packages/core/src/services/store-intelligence.ts
export async function recordStorePreference(
  homeId: string,
  itemId: string,
  storeId: string
) {
  // Log where item was purchased
  const existing = await db.query.itemStore.findFirst({
    where: and(eq(itemStore.itemId, itemId), eq(itemStore.storeId, storeId)),
  });

  if (existing) {
    await db
      .update(itemStore)
      .set({ lastPurchasedAt: new Date() })
      .where(eq(itemStore.id, existing.id));
  } else {
    await db.insert(itemStore).values({
      itemId,
      storeId,
      isPreferred: false,
    });
  }
}

export async function getStoreForItem(
  homeId: string,
  itemId: string
): Promise<Store | null> {
  // Return the store where this item is most often purchased
  const preferences = await db
    .select()
    .from(itemStore)
    .innerJoin(stores, eq(itemStore.storeId, stores.id))
    .where(and(eq(stores.homeId, homeId), eq(itemStore.itemId, itemId)))
    .orderBy(desc(itemStore.lastPurchasedAt))
    .limit(1);

  return preferences[0]?.stores || null;
}

// Pixie suggests store context
export async function generateStoreAwareSuggestion(
  homeId: string,
  itemId: string
): Promise<string | null> {
  const store = await getStoreForItem(homeId, itemId);
  if (!store) return null;

  const templates: Record<string, string[]> = {
    supermarket: [
      `Found ${store.name} usually has this. Want to add it?`,
      `You usually grab this at ${store.name}.`,
    ],
    market: [
      `Fresh from the market—${store.name} is your spot for this.`,
      `${store.name} has great options for this.`,
    ],
    convenience: [
      `Quick stop at ${store.name}?`,
      `${store.name} nearby—shall I add this?`,
    ],
    online: [
      `This arrives fast from ${store.name} online orders.`,
      `Ready to order from ${store.name}?`,
    ],
  };

  const options = templates[store.type] || templates.supermarket;
  return options[Math.floor(Math.random() * options.length)];
}
```

### API Endpoints

```typescript
// POST /homes/:homeId/stores
app.post('/homes/:homeId/stores', async (ctx) => {
  const { name, type, location } = await ctx.req.json();
  const store = await db.insert(stores).values({
    homeId: ctx.params.homeId,
    name,
    type,
    location,
  }).returning();
  return ctx.json(store[0]);
});

// GET /homes/:homeId/stores
app.get('/homes/:homeId/stores', async (ctx) => {
  const stores = await db
    .select()
    .from(stores as any)
    .where(eq(stores.homeId, ctx.params.homeId));
  return ctx.json(stores);
});

// POST /homes/:homeId/items/:itemId/preferred-store/:storeId
app.post('/homes/:homeId/items/:itemId/preferred-store/:storeId', async (ctx) => {
  await recordStorePreference(ctx.params.homeId, ctx.params.itemId, ctx.params.storeId);
  return ctx.json({ success: true });
});
```

### Deliverables

- [ ] Store entity and management
- [ ] Item-store association tracking
- [ ] Store preference recording on purchases
- [ ] Store-aware suggestion generation
- [ ] Frontend store selection in onboarding
- [ ] Store suggestions in chat

---

## 5. Budget Insights (Non-Judgmental) (Week 16, 4 days of effort)

### Objective
Provide spending insights and trends without judgment or enforcement.

### Implementation

```typescript
// packages/core/src/services/budget-insights.ts
export interface SpendingInsight {
  period: 'week' | 'month' | 'year';
  total: number;
  itemCount: number;
  averagePerItem: number;

  // Trends
  comparison?: {
    previousPeriod: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };

  // Categories
  byCategory: Record<string, { total: number; itemCount: number }>;

  // Interesting facts (non-judgmental)
  insights: string[];
}

export async function generateSpendingInsight(
  homeId: string,
  period: 'week' | 'month' = 'week'
): Promise<SpendingInsight> {
  const days = period === 'week' ? 7 : 30;
  const startDate = addDays(new Date(), -days);

  // Get completed lists in period
  const lists = await db
    .select()
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.homeId, homeId),
        eq(groceryLists.state, 'completed'),
        gte(groceryLists.completedAt, startDate)
      )
    );

  // Get all items in those lists
  const listItems = await db
    .select()
    .from(listItems as any)
    .innerJoin(items as any, eq(listItems.itemId, items.id))
    .where(
      and(
        inArray(listItems.listId, lists.map((l) => l.id)),
        eq(listItems.state, 'purchased')
      )
    );

  // Calculate total and breakdown
  const total = listItems.reduce(
    (sum, row) => sum + (parseFloat(row.items.estimatedPrice || '0') * row.listItems.quantity),
    0
  );

  const byCategory: Record<string, { total: number; itemCount: number }> = {};
  listItems.forEach((row) => {
    const cat = row.items.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, itemCount: 0 };
    byCategory[cat].total += parseFloat(row.items.estimatedPrice || '0') * row.listItems.quantity;
    byCategory[cat].itemCount += 1;
  });

  // Generate insights
  const insights = generateNonJudgmentalInsights(total, listItems, byCategory, period);

  // Compare to previous period
  const previousStartDate = addDays(startDate, -days);
  const previousLists = await db
    .select()
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.homeId, homeId),
        eq(groceryLists.state, 'completed'),
        gte(groceryLists.completedAt, previousStartDate),
        lt(groceryLists.completedAt, startDate)
      )
    );

  let comparison: SpendingInsight['comparison'] | undefined;
  if (previousLists.length > 0) {
    // Calculate previous total
    const previousItems = await db
      .select()
      .from(listItems as any)
      .innerJoin(items as any, eq(listItems.itemId, items.id))
      .where(
        and(
          inArray(listItems.listId, previousLists.map((l) => l.id)),
          eq(listItems.state, 'purchased')
        )
      );

    const previousTotal = previousItems.reduce(
      (sum, row) => sum + (parseFloat(row.items.estimatedPrice || '0') * row.listItems.quantity),
      0
    );

    const changePercent = ((total - previousTotal) / previousTotal) * 100;
    comparison = {
      previousPeriod: previousTotal,
      changePercent,
      trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable',
    };
  }

  return {
    period,
    total,
    itemCount: listItems.length,
    averagePerItem: total / listItems.length,
    byCategory,
    insights,
    comparison,
  };
}

function generateNonJudgmentalInsights(
  total: number,
  items: any[],
  byCategory: Record<string, any>,
  period: string
): string[] {
  const insights: string[] = [];

  // Fact-based observations
  const topCategory = Object.entries(byCategory).sort(
    (a, b) => b[1].total - a[1].total
  )[0];

  if (topCategory) {
    const [cat, data] = topCategory;
    const percent = ((data.total / total) * 100).toFixed(0);
    insights.push(`${cat.charAt(0).toUpperCase()}${cat.slice(1)} was your main spend this ${period} (${percent}%).`);
  }

  // Trend observation (not judgment)
  const avgPrice = total / items.length;
  const expensiveItems = items.filter(
    (row) => parseFloat(row.items.estimatedPrice || '0') > avgPrice * 1.5
  );

  if (expensiveItems.length > 0) {
    insights.push(`${expensiveItems.length} higher-ticket items this ${period}.`);
  }

  return insights;
}
```

### Frontend Display

```typescript
// packages/web/src/components/SpendingChart.tsx
export function SpendingChart({ homeId }: { homeId: string }) {
  const insightQuery = useQuery({
    queryKey: ['spending', homeId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/homes/${homeId}/spending?period=week`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
  });

  const insight = insightQuery.data;

  return (
    <div className="p-4 bg-white border border-neutral-200 rounded-lg">
      <h3 className="font-medium mb-4">Spending This Week</h3>

      {/* Total */}
      <div className="mb-6">
        <p className="text-3xl font-bold text-primary">฿{insight?.total.toFixed(2)}</p>
        <p className="text-sm text-neutral-600">{insight?.itemCount} items</p>

        {/* Trend */}
        {insight?.comparison && (
          <p className={`text-sm mt-2 ${
            insight.comparison.trend === 'up' ? 'text-amber-600' : 'text-green-600'
          }`}>
            {insight.comparison.trend === 'up' ? '↑' : '↓'}
            {' '}
            {Math.abs(insight.comparison.changePercent).toFixed(1)}% from last week
          </p>
        )}
      </div>

      {/* Breakdown by category */}
      <div className="mb-4">
        {Object.entries(insight?.byCategory || {}).map(([cat, data]: any) => (
          <div key={cat} className="flex justify-between text-sm mb-2">
            <span className="capitalize">{cat}</span>
            <span>฿{data.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="pt-4 border-t border-neutral-200">
        {insight?.insights.map((ins: string, i: number) => (
          <p key={i} className="text-sm text-neutral-600 mb-2">{ins}</p>
        ))}
      </div>
    </div>
  );
}
```

### Deliverables

- [ ] Spending calculation and breakdown
- [ ] Comparison to previous periods
- [ ] Non-judgmental insight generation
- [ ] `/homes/:homeId/spending` endpoint
- [ ] Frontend spending chart component
- [ ] Category breakdown visualization

---

## 6. Enhanced Pixie Personality (Weeks 17-18, 5 days of effort)

### Objective
Make Pixie more contextual, remembering preferences and using humor appropriately.

### Personality System

```typescript
// packages/core/src/agent/personality.ts
export interface PixiePersonality {
  tone: 'friendly' | 'professional' | 'humorous';
  rememberPreferences: boolean;
  contextualResponses: boolean;
  rememberedPrefs: Record<string, any>;
}

// Build Pixie's instructions dynamically based on household
export async function buildPixieSystemPrompt(homeId: string): Promise<string> {
  const home = await db.query.homes.findFirst({
    where: (h) => eq(h.id, homeId),
  });

  const members = await db
    .select()
    .from(homeMembers)
    .where(eq(homeMembers.homeId, homeId));

  const recentPurchases = await db
    .select()
    .from(purchaseEvents)
    .where(eq(purchaseEvents.homeId, homeId))
    .orderBy(desc(purchaseEvents.purchasedAt))
    .limit(20);

  const topCategories = Object.entries(
    recentPurchases.reduce((acc: any, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const currentSeason = getCurrentSeason();

  return `You are Pixie, a domestic AI steward for the household: "${home.name}".

Members: ${members.map((m) => m.userId).join(', ')}

Context:
- Season: ${currentSeason.name}
- Common purchases: ${topCategories.join(', ')}
- Location: Bangkok, Thailand (use local context where relevant)

Personality:
- Be warm, conversational, and slightly playful
- Remember household patterns and preferences
- Ask clarifying questions when needed
- Provide neutral responses when multiple people are involved (don't pick sides)
- Use Thai context where relevant (e.g., mention local stores, seasonal produce)
- Never be judgmental about spending
- Acknowledge both partners equally in decisions

Response Style:
- Keep messages concise (<2 sentences usually)
- Use emojis sparingly and naturally
- Respond with structured JSON when adding items
- Always include confidence in entity extraction
- Ask for confirmation if unsure (confidence <0.8)

Remember: You're a household helper, not a parent or judge.`;
}

// Enhanced message processing with personality
export async function processPixieMessageWithPersonality(
  message: string,
  homeId: string,
  threadId: string
): Promise<PixieResponse> {
  // 1. Build personalized system prompt
  const systemPrompt = await buildPixieSystemPrompt(homeId);

  // 2. Get recent context from chat
  const recentMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(10);

  const conversationContext = recentMessages
    .reverse()
    .map((m) => `${m.author}: ${m.content}`)
    .join('\n');

  // 3. Call Pixie with enhanced context
  const pixieAgent = new Agent({
    name: 'pixie',
    model: 'gpt-4-turbo',
    instructions: systemPrompt,
  });

  const response = await pixieAgent.generate(message, {
    conversationContext,
    threadId,
  });

  // 4. Validate and return
  return PixieResponseSchema.parse(response);
}
```

### Contextual Humor

```typescript
// packages/core/src/agent/humor.ts
export async function maybeAddHumor(
  response: PixieResponse,
  homeId: string
): Promise<PixieResponse> {
  // 50% chance to add light humor
  if (Math.random() < 0.5) return response;

  // Check if context allows humor (don't humor serious requests)
  if (response.intent === 'chat') {
    const humors = [
      `(I promise I didn't eat any of these myself.)`,
      `(Yes, I know that's your third pack of these this month. No judgment!)`,
      `(I'll just be here, keepi ng the list organized.)`,
      `(Shopping's about to get a lot smoother!)`,
    ];

    response.message += ' ' + humors[Math.floor(Math.random() * humors.length)];
  }

  return response;
}
```

### Preference Learning

```typescript
// packages/core/src/services/preference-learning.ts
export interface HouseholdPreference {
  id: string;
  homeId: string;
  preferenceType: 'brand' | 'quality' | 'source' | 'diet';
  key: string;
  value: string;
  frequency: number; // How many times this preference was observed
  lastObservedAt: Date;
}

// When user corrects Pixie or specifies preferences, log it
export async function learnPreference(
  homeId: string,
  prefType: string,
  key: string,
  value: string
) {
  const existing = await db.query.householdPreferences.findFirst({
    where: and(
      eq(householdPreferences.homeId, homeId),
      eq(householdPreferences.preferenceType, prefType),
      eq(householdPreferences.key, key)
    ),
  });

  if (existing) {
    await db
      .update(householdPreferences)
      .set({
        value,
        frequency: existing.frequency + 1,
        lastObservedAt: new Date(),
      })
      .where(eq(householdPreferences.id, existing.id));
  } else {
    await db.insert(householdPreferences).values({
      homeId,
      preferenceType: prefType,
      key,
      value,
      frequency: 1,
    });
  }
}

// Example: User says "Get the organic milk"
// Pixie learns: preference type='quality', key='milk', value='organic'
```

### Deliverables

- [ ] Dynamic system prompt builder
- [ ] Personality configuration per household
- [ ] Preference learning system
- [ ] Enhanced Pixie responses with context
- [ ] Light humor system (optional)
- [ ] Memory of household patterns
- [ ] Tests for response appropriateness

---

## 7. Notification System (Calm, Non-Aggressive) (Week 17, 3 days of effort)

### Objective
Remind users without being intrusive or annoying.

### Notification Strategy

```typescript
// packages/core/src/services/notifications.ts
export enum NotificationType {
  SUGGESTION = 'suggestion',        // "Time to restock eggs?"
  SYNC_REMINDER = 'sync_reminder',  // "Weekly sync ready"
  COMPLETION = 'completion',        // "List completed!"
  INVITE = 'invite',                // "Partner invited"
}

export interface NotificationRule {
  id: string;
  homeId: string;
  userId: string;
  type: NotificationType;
  frequency: 'immediate' | 'daily_digest' | 'weekly_digest' | 'never';
  quietHours?: { startHour: number; endHour: number }; // e.g., 22:00 to 08:00
}

// Smart scheduling
export async function shouldNotify(
  userId: string,
  notifType: NotificationType
): Promise<boolean> {
  const rule = await db.query.notificationRules.findFirst({
    where: and(
      eq(notificationRules.userId, userId),
      eq(notificationRules.type, notifType)
    ),
  });

  if (!rule || rule.frequency === 'never') return false;
  if (rule.frequency === 'immediate') return true;

  // Check quiet hours
  if (rule.quietHours) {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= rule.quietHours.startHour && hour < rule.quietHours.endHour) {
      return false;
    }
  }

  // For digest modes, would check if enough time has passed
  // (not implemented here; Phase 3+)

  return true;
}

// Send notification
export async function notifyUser(
  userId: string,
  notification: {
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, any>;
  }
) {
  if (!(await shouldNotify(userId, notification.type))) {
    console.log(`Notification suppressed for ${userId}`);
    return;
  }

  // Send via push notification
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user && user.pushToken) {
    await sendPushNotification(user.pushToken, {
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });
  }

  // Also log for in-app notification center
  await db.insert(notifications).values({
    userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    isRead: false,
  });
}

// Example: Suggest item only once per day, max
export async function smartItemSuggestion(homeId: string, itemId: string) {
  const members = await db
    .select()
    .from(homeMembers)
    .where(eq(homeMembers.homeId, homeId));

  for (const member of members) {
    // Check if suggested in last 24 hours
    const recent = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, member.userId),
        eq(notifications.type, NotificationType.SUGGESTION),
        gte(notifications.createdAt, addDays(new Date(), -1))
      ),
    });

    if (!recent) {
      await notifyUser(member.userId, {
        type: NotificationType.SUGGESTION,
        title: 'Time to restock?',
        body: `${item.name} might be running low. Add it?`,
        data: { itemId, action: 'add' },
      });
    }
  }
}
```

### Frontend Notification Center

```typescript
// packages/web/src/components/NotificationCenter.tsx
export function NotificationCenter() {
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.json();
    },
    refetchInterval: 30000, // Every 30s
  });

  return (
    <div className="p-4 space-y-2">
      {notificationsQuery.data?.map((n: any) => (
        <div
          key={n.id}
          className={`p-3 rounded-lg ${
            n.isRead ? 'bg-neutral-100' : 'bg-primary/10'
          }`}
        >
          <p className="font-medium text-sm">{n.title}</p>
          <p className="text-sm text-neutral-600">{n.body}</p>
          {!n.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAsRead(n.id)}
              className="mt-2"
            >
              Dismiss
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Deliverables

- [ ] Notification rules and preferences
- [ ] Smart scheduling (quiet hours, frequency)
- [ ] Push notification integration
- [ ] Notification center in app
- [ ] Digest mode (Phase 3+)
- [ ] Tests for notification logic

---

## Phase 3 Acceptance Criteria (Hard Gate)

All must be true to proceed to Phase 4:

### 1. Purchase Pattern Learning
- [ ] 70%+ prediction accuracy for recurring items
- [ ] Confidence scores reflect actual accuracy
- [ ] Handles small sample sizes gracefully

### 2. Smart Suggestions
- [ ] Suggestions appear 7 days before predicted depletion
- [ ] Users interact with >50% of suggestions
- [ ] Recurring items work reliably

### 3. Seasonal Awareness
- [ ] Seasonal boosts applied correctly
- [ ] Seasonal insights non-empty
- [ ] Bangkok-specific context evident

### 4. Multi-Store Awareness
- [ ] Item-store associations tracked
- [ ] Store-aware suggestions generated
- [ ] Most common store suggested by default

### 5. Budget Insights
- [ ] Spending calculated correctly (THB)
- [ ] Comparisons to previous periods work
- [ ] Insights are factual and non-judgmental

### 6. Enhanced Pixie
- [ ] Personality varies by household
- [ ] Preferences learned and remembered
- [ ] Contextual responses evident

### 7. Notifications
- [ ] No notifications during quiet hours
- [ ] Frequency preferences respected
- [ ] Notification center accurate

### 8. Metrics
- [ ] 80%+ user satisfaction with suggestions
- [ ] 20%+ conversion to premium on intelligence features
- [ ] <2% false positive predictions

---

## Success Metrics for Phase 3

| Metric | Target | Owner |
|--------|--------|-------|
| Prediction Accuracy | 70%+ | ML Engineer |
| User Suggestion Engagement | 50%+ | Product Lead |
| Notification Opt-In Rate | 80%+ | Growth Lead |
| Premium Feature Adoption | 20%+ | Product Lead |
| Seasonal Insight Relevance | >4/5 rating | UX Researcher |

---

## Timeline Breakdown

| Week | Focus | Deliverables |
|------|-------|------------|
| 13-15 | Pattern Learning | Depletion predictor, data collection |
| 14-15 | Smart Suggestions | Suggestion engine, recurring items |
| 15-16 | Seasonal + Multi-Store | Seasonal awareness, store tracking |
| 16 | Budget Insights | Spending analysis, non-judgmental insights |
| 17-18 | Personality + Notifications | Enhanced Pixie, notification system |

---

**Phase 3 Status:** Ready to Begin
**Estimated Effort:** 26 person-days
**Team Size:** 1 ML engineer, 1 backend engineer, 1 frontend engineer
