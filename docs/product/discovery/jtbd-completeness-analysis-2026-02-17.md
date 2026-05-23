# Pantry Pixie: Jobs To Be Done (JTBD) Completeness Analysis

**Date:** 2026-02-17
**Author:** Product Manager (Agent)
**Scope:** Full codebase and documentation review
**Status:** Active analysis -- informs Phase 1-2 prioritization

---

## TLDR

- Pantry Pixie targets 5 core jobs and 3 secondary jobs. **3 of 5 core jobs have functional implementations; 2 remain structurally stubbed or missing.**
- The strongest coverage is in **conversational grocery list management** (Job 1) -- this is the primary UX and is well-executed with AI tools, real-time sync, and in-chat list editing.
- The largest gap is **multi-user coordination and visibility** (Job 3) -- the product's core differentiation as a "couples-first" tool. Shared home infrastructure exists, but no features surface partner activity, coordination, or conflict resolution.
- **Budget awareness** (Job 4) has backend calculation but no proactive surfacing; it exists as a passive card users must seek out, contradicting the "calm visibility" promise.
- **Predictive intelligence** (Job 5) -- recurring items, depletion prediction, smart suggestions -- is schema-ready but has no active engine. The schema supports recurrence types but nothing triggers or notifies.
- The **emotional positioning** (harmony, not optimization) is well-articulated in docs and persona writing but has almost no implementation in the product UX. The product currently behaves like a single-user pantry tracker, not a household coordination tool.

---

## 1. Core Jobs Identified

Based on synthesis of the product model canvas, ICP, pitch deck, persona docs, and phase plans, these are the core Jobs To Be Done that users hire Pantry Pixie to accomplish:

### Job 1: "Help me manage what we need to buy without thinking about it"
**Functional job:** Maintain a grocery/shopping list that both partners can see and edit, with AI assistance to reduce manual entry.

### Job 2: "Help me know what we have at home so I stop buying duplicates"
**Functional job:** Track pantry inventory with enough accuracy to prevent double-purchases and catch items running low.

### Job 3: "Help us coordinate grocery shopping without nagging each other"
**Functional job:** Make both partners' shopping activity visible so coordination happens through a shared system rather than through direct conversation.

### Job 4: "Help me understand our food spending without anxiety"
**Functional job:** Provide calm, non-judgmental visibility into household grocery spending so budget conversations can happen from shared data.

### Job 5: "Learn our household patterns so the system gets smarter over time"
**Functional job:** Automatically surface recurring needs, seasonal patterns, and predictive suggestions based on purchase history.

---

## 2. Secondary Jobs Identified

### Job 6: "Let me manage my pantry from wherever I am, including offline"
**Functional job:** PWA with offline support, cross-device sync, installable app experience.

### Job 7: "Help me plan meals based on what we actually have"
**Functional job:** Recipe/meal suggestions grounded in current inventory.

### Job 8: "Let me interact naturally instead of filling out forms"
**Functional job:** Conversational AI interface as primary UX, not traditional CRUD forms.

---

## 3. Coverage Assessment Per Job

### Job 1: Grocery List Management
**Coverage: STRONG (80%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| Create grocery lists | Implemented | `groceryListsService.createList()`, `CreateListSheet` component |
| Add items to list (manual) | Implemented | `AddItemInput`, `handleAddListItemByName` API endpoint |
| Add items to list (via AI) | Implemented | `createAddToListTool` -- Pixie can parse "add eggs to my list" and call tool with structured items |
| Add recipe ingredients to list (via AI) | Implemented | `addToList` tool supports multi-item array with quantities/units, prompt instructs Pixie to expand recipes |
| Toggle items as purchased | Implemented | `toggleListItem` with optimistic UI updates in chat and list views |
| Remove items from list | Implemented | `removeListItem` mutation |
| View list with completion progress | Implemented | `GroceryListCard` with `ShoppingProgress` component |
| Multiple named lists | Implemented | Default "Quick Items" + named lists with create/delete |
| Scheduled/recurring lists | Partially implemented | Schema has `recurringSchedule`, `scheduleDayOfWeek`, `scheduleDayOfMonth`, `nextResetAt`, `roundNumber`. `resetScheduledList` exists. But no automated scheduler runs to actually trigger resets. |
| Duplicate detection (cross-list) | Not implemented | `addToList` tool checks for duplicates within a single list but not across lists. No cross-partner duplication alerting. |
| Real-time list sync | Implemented | WebSocket `list_update` messages propagate toggle/add/remove across connected clients |
| "Sunday Sync" ritual | Not implemented | Mentioned in Phase 1 plan as a key feature but no implementation exists |

**Gaps:**
- No automated list reset scheduler for recurring lists
- No cross-list or cross-partner duplicate detection
- No "Sunday Sync" collaborative review ritual
- No list sharing/sending to specific stores

---

### Job 2: Pantry Inventory Tracking
**Coverage: MODERATE (55%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| Add items to pantry (via AI) | Implemented | `createAddItemTool` -- Pixie handles "I just bought milk" |
| Add items to pantry (manual) | Implemented | `handleCreateItem` API endpoint |
| Remove/use items | Implemented | `removeItem`, `toggleItemCheck` |
| Item categories | Implemented | 12 categories in `itemCategoryEnum` |
| Item expiration tracking | Schema-ready | `expiresAt` field exists on items table. No UI surfacing, no expiration warnings, no notification system. |
| Item usage history | Schema-ready | `itemUsageHistory` table defined with `quantityUsed`, `usageDate`. Not connected to any service or UI. |
| Inventory search/filter | Implemented | `listItems` supports `category` and `search` query params |
| Inventory stats | Implemented | `getStats()` in items service, `handleGetItemStats` endpoint |
| Item location tracking | Schema-ready | `location` field on items table. No UI. |
| Preferred brand/store | Schema-ready | `preferredBrand`, `preferredStore` fields. No UI or AI utilization. |
| "Do I have X?" query via AI | Implemented | `createListItemsTool` + `ask_status` intent classification |

**Gaps:**
- No expiration tracking UI or notifications -- items table has `expiresAt` and `expiryWarningDays` but nothing reads or acts on them
- Item usage history table exists but is never written to or read
- No inventory dashboard/view in the frontend -- items are only visible through AI chat queries or as list items
- No "items running low" proactive surfacing
- Location, brand, and store preference fields are not utilized anywhere

---

### Job 3: Multi-User Coordination ("The Couples Job")
**Coverage: WEAK (25%)**

This is the most critical gap. The product's entire differentiation is built on household coordination, but the implementation is almost entirely single-user.

| Capability | Status | Evidence |
|-----------|--------|----------|
| Shared home concept | Implemented | `homes` table, `homeMembers` with roles (owner/admin/member/viewer) |
| Invite partner to home | Implemented | Invite creation, accept invite, onboarding invite step, `InviteCard` component |
| Both partners see same lists | Implemented | All queries scoped to `homeId`, WebSocket broadcasts to home |
| Both partners can talk to Pixie | Implemented | Chat threads scoped to home, messages include `userId` in metadata |
| See who added what | Not implemented | `addedBy` exists on items table. Never surfaced in UI. `userId` in chat metadata is not displayed. |
| Activity feed / partner visibility | Not implemented | No way to see "Partner added eggs at 3pm" or "Partner is at Big C right now" |
| Coordination nudges | Not implemented | No "Both of you added milk today" notifications. No duplicate purchase alerts across users. |
| Conflict resolution | Not implemented | No neutral mediation features. Pixie prompt mentions neutrality but has no tools to detect or mediate conflicts. |
| Shopping attribution (who bought) | Not implemented | Items track `addedBy` but this is never surfaced or used for coordination |
| Partner shopping status | Not implemented | No "Partner is currently shopping" or "Partner checked off items" real-time signals |
| Harmony-preserving messaging | Not implemented | Pixie has no tools or context to detect couple dynamics. The `userPreferences` passed to agent don't include partner awareness. |
| "Sunday Sync" weekly review | Not implemented | Described in docs as flagship couples feature. No implementation. |

**Gaps (Critical):**
- Zero couple-specific features beyond shared data access
- No partner activity visibility
- No coordination nudges or duplicate purchase prevention across users
- No neutral mediation or conflict detection
- The entire "relationship-aware" positioning exists only in documentation
- Pixie has no context about who the other household members are or their preferences
- No "Sunday Sync" or collaborative decision-making flows

---

### Job 4: Budget Awareness
**Coverage: MODERATE (50%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| Weekly/monthly spending calculation | Implemented | `calculateSpending()` in budget service with week/month/all-time periods |
| Category breakdown | Implemented | `CategorySpending` aggregation in budget service |
| Spending trend detection | Implemented | `getSpendingInsights()` calculates increasing/decreasing/stable trends |
| Budget UI card | Implemented | `BudgetCard` component with THB formatting, expandable category breakdown, trend indicator |
| Budget query via AI | Partially implemented | `budget_question` intent classification exists. Pixie prompt includes budget-related guidance. But no dedicated budget query tool for the AI agent. |
| Budget target/limit | Schema-ready | `totalBudget` on grocery lists. `HomeStats` type has `monthlyBudget`. But no home-level budget setting UI or enforcement. |
| Spending alerts | Not implemented | No proactive notifications when spending approaches thresholds |
| Non-judgmental framing | Partially implemented | Pixie prompt says to be non-judgmental. BudgetCard uses neutral language. But no systematic enforcement of the "no shame" principle. |
| Multi-store spending visibility | Not implemented | `preferredStore` exists on items but no store-level spending breakdown |
| Currency/locale awareness | Implemented | THB formatting in `currency.ts` with `formatTHB` and `formatTHBCompact` |

**Gaps:**
- No AI budget query tool (Pixie cannot actually look up spending data when asked)
- No home-level budget target setting
- No proactive spending alerts or gentle nudges
- No multi-store spending breakdown (key Bangkok ICP pain point)
- Budget card is passive -- hidden in list view, not proactively shown

---

### Job 5: Predictive Intelligence / Learning
**Coverage: MINIMAL (15%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| Recurring item scheduling | Schema-ready | `recurrenceType`, `recurrenceInterval`, `nextRecurrenceDate` fields on items. `createSetRecurringTool` AI tool exists. But no scheduler checks or triggers recurrence. |
| Set recurring via AI | Implemented | `setRecurring` tool lets user say "set milk as recurring weekly" and Pixie updates the item. |
| Depletion prediction | Not implemented | No usage rate calculation despite `itemUsageHistory` table existing |
| Purchase pattern learning | Not implemented | No analysis of shopping patterns, frequencies, or behaviors |
| Seasonal awareness | Not implemented | Mentioned in Phase 3 plan. No implementation. |
| Smart list suggestions | Not implemented | AI does not auto-suggest items based on patterns |
| Weekly draft generation | Not implemented | Described in product canvas as core Pixie capability. No implementation. |
| Expiration-based suggestions | Not implemented | Items have `expiresAt` but it's never checked or acted upon |

**Gaps (Critical for long-term value):**
- Recurring items can be set but nothing ever fires -- there is no cron/scheduler/background job that checks `nextRecurrenceDate` and takes action
- No learning engine at all -- every session starts cold
- No proactive suggestions or draft lists
- The entire Phase 3 "Intelligence Layer" is unbuilt
- `itemUsageHistory` table exists but is a dead table -- never written to

---

### Job 6: Cross-Device / Offline Access
**Coverage: GOOD (70%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| PWA / installable | Implemented | Service worker, `usePWAInstall` hook, install prompt in settings, iOS instructions |
| Offline indicator | Implemented | `OfflineIndicator`, `useNetworkStatus`, `SyncStatusBadge` components |
| Offline-aware mutations | Implemented | `useOfflineAwareMutation` hook, `offline-queue.ts` for queueing |
| IndexedDB for offline storage | Implemented | `db.ts` client-side with Dexie (IndexedDB wrapper) |
| Offline empty state | Implemented | `OfflineEmptyState` component |
| Background sync | Partially implemented | `useInventorySync` hook. Service worker registration exists. Full sync conflict resolution not implemented. |

**Gaps:**
- No CRDT or vector clock conflict resolution (identified as risk in phase plan)
- Offline chat with Pixie is not possible (requires server + OpenAI)

---

### Job 7: Meal Planning
**Coverage: MINIMAL (10%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| Meal planning intent | Classified | `meal_planning` intent in classification system |
| Recipe suggestion via AI | Partial | Pixie prompt says to suggest recipes. But Pixie has no inventory-aware tool -- cannot actually query what's in the pantry and suggest matching recipes in a structured way. |
| Meal plan generation | Not implemented | No weekly meal plan feature |
| Recipe-to-list conversion | Implemented | `addToList` tool can take recipe ingredients and add them all to a list |

**Gaps:**
- No structured meal planning feature
- Pixie can suggest recipes from general knowledge but cannot cross-reference actual pantry inventory in a reliable way (the `listItems` tool exists but is not specifically designed for meal planning queries)

---

### Job 8: Natural Conversational Interface
**Coverage: STRONG (85%)**

| Capability | Status | Evidence |
|-----------|--------|----------|
| Chat-first UX | Implemented | Chat page is primary navigation tab. Chat is the main interaction surface. |
| AI streaming responses | Implemented | `streamText` with Vercel AI SDK, WebSocket streaming to client |
| Intent classification | Implemented | `classifyIntent()` with 10 intent types and keyword/pattern matching |
| Tool calling | Implemented | 8 AI tools: addItem, listItems, removeItem, checkItem, setRecurring, addToList, listGroceryLists, showGroceryListEditor |
| In-chat UI components | Implemented | `ChatBubbleWithUI` renders grocery lists, list editors inline in chat |
| Starter prompts | Implemented | `StarterPrompts` for empty chat state |
| Pixie personality | Implemented | Detailed system prompt with personality traits, tone guidance, examples |
| User preference awareness | Partially implemented | `generateSystemPrompt` accepts dietary restrictions, cooking skill, budget consciousness, home size. But user preferences are never actually loaded from DB -- always passed as `undefined`. |
| Context window | Implemented | Last 20 messages loaded for agent context |

**Gaps:**
- User preferences are never loaded from the database -- `createPixieResponse` always receives `undefined` for preferences
- No user profile settings page to configure dietary restrictions, cooking skill, etc.
- No per-user preference storage in the database schema (would need to extend `users` table or add preferences table)

---

## 4. Priority Gap Analysis

### Tier 1: Critical Gaps (Block core value proposition)

**Gap 1: Multi-User Coordination Has Zero Implementation**
- **Impact:** The entire product positioning ("couples-first", "household harmony") rings hollow. Currently functions as a single-user app that happens to share data.
- **What's needed:**
  - Partner activity feed or notification ("Aaron added eggs, Noi checked off rice")
  - Cross-user duplicate purchase detection ("Both of you have milk on your lists")
  - Neutral attribution in Pixie responses (knowing who is asking, who else uses the home)
  - "Sunday Sync" collaborative review flow
- **Effort estimate:** Medium (infrastructure exists; needs service layer + UI)

**Gap 2: No Inventory Dashboard or Expiration Management**
- **Impact:** Users cannot see what's in their pantry without asking Pixie. The core premise -- "know what we have" -- requires a browse-able inventory view.
- **What's needed:**
  - Inventory tab/view with categorized items, quantities, expiration dates
  - Expiration warnings (items expiring within N days)
  - "Running low" indicators based on quantity thresholds
- **Effort estimate:** Medium (schema complete; needs UI + notification logic)

**Gap 3: Pixie Has No Access to User Preferences**
- **Impact:** `generateSystemPrompt` supports user preferences but `undefined` is always passed. Pixie cannot personalize responses for dietary needs, cooking skill, or household size.
- **What's needed:**
  - User preferences storage (DB table or JSON column)
  - Settings UI for dietary restrictions, cooking skill, household size
  - Wire preferences from DB into agent calls
- **Effort estimate:** Small

### Tier 2: Important Gaps (Degrade value but don't block core flow)

**Gap 4: Budget Query Tool for AI Agent**
- **Impact:** Users can ask "how much have I spent?" but Pixie cannot actually answer -- no budget query tool exists for the agent.
- **What's needed:** Create a `queryBudget` AI tool that calls `getBudgetSummary()` and returns data to Pixie for conversational response.
- **Effort estimate:** Small

**Gap 5: Recurring Item Scheduler**
- **Impact:** Users can set items as recurring via Pixie, but nothing ever triggers. The promise "I'll keep track of when you need to restock" is broken.
- **What's needed:** Background job or cron that checks `nextRecurrenceDate` across all items and auto-adds to lists or triggers notifications.
- **Effort estimate:** Medium (needs background job infrastructure)

**Gap 6: "Sunday Sync" Weekly Review Feature**
- **Impact:** Described as a key product ritual in multiple docs. Not implemented. This is the flagship couples coordination feature.
- **What's needed:** Scheduled prompt/notification + collaborative review UI where both partners can approve/modify the upcoming week's list together.
- **Effort estimate:** Large

### Tier 3: Enhancement Gaps (Nice to have for MVP, important for growth)

**Gap 7: Structured Meal Planning**
- **Impact:** Users can ask Pixie for meal ideas, but there's no structured meal plan feature. Recipe-to-list works but is ad hoc.
- **Effort estimate:** Large

**Gap 8: Multi-Store Awareness**
- **Impact:** Core Bangkok ICP pain point (fragmented shopping across 4-6 stores). Schema has `preferredStore` but nothing uses it.
- **Effort estimate:** Medium

**Gap 9: Item Usage History Activation**
- **Impact:** `itemUsageHistory` table is dead code. Activating it enables depletion prediction and smarter suggestions.
- **Effort estimate:** Small (write usage events; larger to build prediction)

**Gap 10: LINE Integration**
- **Impact:** Bangkok ICP uses LINE as primary messaging. Phase 4 feature but critical for market penetration.
- **Effort estimate:** Large

---

## 5. JTBD Completeness Matrix

| Job | Description | Completeness | Priority to Address |
|-----|------------|-------------|-------------------|
| Job 1 | Grocery list management | 80% | Low (strong already) |
| Job 2 | Pantry inventory tracking | 55% | High |
| Job 3 | Multi-user coordination | 25% | **Critical** |
| Job 4 | Budget awareness | 50% | Medium |
| Job 5 | Predictive intelligence | 15% | Medium (Phase 3) |
| Job 6 | Cross-device / offline | 70% | Low |
| Job 7 | Meal planning | 10% | Low (Phase 3-4) |
| Job 8 | Conversational interface | 85% | Low (strong already) |

**Overall JTBD Completeness: ~49%**

The product has a strong foundation in infrastructure (schemas, AI tooling, real-time sync, PWA) but the features that differentiate it from competitors (multi-user coordination, budget awareness, predictive intelligence) are the least built.

---

## 6. Recommendations

### Immediate (This Sprint)

1. **Wire user preferences into Pixie agent calls.** Currently hardcoded as `undefined`. Add a simple JSON preferences column to users table, create a settings form, and pass preferences to `createPixieResponse`. This is a small change that dramatically improves Pixie's personalization.

2. **Create a budget query tool for the AI agent.** The budget service exists and calculates weekly/monthly spending. Wrap it as a Vercel AI SDK tool so Pixie can answer "how much have I spent this month?" with actual data.

3. **Add an inventory view/tab to the frontend.** Users need a way to browse what's in their pantry without asking Pixie. Use the existing `listItems` endpoint with category grouping.

### Short-Term (Next 2-3 Sprints)

4. **Build the partner activity feed.** Surface `addedBy` attribution on items. Add WebSocket events for partner actions. Show a lightweight activity stream ("Aaron added eggs 2h ago"). This is the minimum viable "couples-first" feature.

5. **Implement cross-user duplicate detection.** When Partner A adds "milk" to a list, check if Partner B already has "milk" on another list or recently purchased it. Surface through Pixie: "Heads up -- Aaron added milk to Quick Items earlier today."

6. **Activate expiration tracking.** Items have `expiresAt` and `expiryWarningDays` fields. Build a query that surfaces items expiring within the warning window. Show in inventory view and let Pixie proactively mention them.

7. **Build the recurring item scheduler.** Create a lightweight cron/interval check that scans for items where `nextRecurrenceDate <= today`, auto-adds them to the default grocery list, and notifies via WebSocket.

### Medium-Term (Phase 2-3)

8. **Design and build the "Sunday Sync" ritual.** This is the highest-value couples feature. A scheduled prompt that surfaces the week's suggested list, lets both partners review and modify, and creates the active list for the week.

9. **Build multi-store spending breakdown.** Extend budget service to group spending by `preferredStore`. Critical for Bangkok ICP where spending is fragmented across wet markets, supermarkets, and imported goods stores.

10. **Activate item usage history.** Start writing to the `itemUsageHistory` table when items are removed or quantities decrease. This becomes the foundation for depletion prediction in Phase 3.

---

## ACTION PLAN

1. **[Immediate]** Wire user preferences from DB to agent -- Add JSON column, settings UI, pass to `createPixieResponse`
   - DRI: Engineering lead
   - Dependencies: None
   - Success criteria: Pixie responses reflect user's dietary restrictions and cooking skill

2. **[Immediate]** Create `queryBudget` AI agent tool -- Wrap `getBudgetSummary` as Vercel AI SDK tool
   - DRI: Engineering lead
   - Dependencies: Budget service (already implemented)
   - Success criteria: User asks "what did I spend this week?" and gets accurate, conversational answer

3. **[Immediate]** Build inventory browse view -- New tab/page showing items grouped by category with search
   - DRI: Frontend engineer
   - Dependencies: `listItems` API (already implemented)
   - Success criteria: Users can see all pantry items without chatting with Pixie

4. **[Short-term]** Partner activity visibility -- WebSocket events for partner actions, lightweight feed
   - DRI: Full-stack engineer
   - Dependencies: WebSocket infrastructure (exists), `addedBy` tracking (exists)
   - Success criteria: Both partners can see each other's recent shopping activity

5. **[Short-term]** Cross-partner duplicate detection -- Alert when both users add same item
   - DRI: Backend engineer
   - Dependencies: Item deduplication logic
   - Success criteria: System catches and surfaces duplicate purchases before they happen

6. **[Short-term]** Expiration tracking activation -- Query items near expiry, surface in UI and chat
   - DRI: Full-stack engineer
   - Dependencies: `expiresAt` field (exists in schema)
   - Success criteria: Users are notified about items expiring within their warning window

7. **[Short-term]** Recurring item scheduler -- Background job that auto-adds recurring items to lists
   - DRI: Backend engineer
   - Dependencies: Recurring fields in schema (exist)
   - Success criteria: Items set as "weekly" actually appear on lists every week

8. **[Medium-term]** "Sunday Sync" collaborative review -- Scheduled prompt + shared review UI
   - DRI: Product + Engineering
   - Dependencies: Partner activity (#4), Recurring scheduler (#7)
   - Success criteria: Both partners review and approve next week's list in a collaborative flow

9. **[Medium-term]** Multi-store spending breakdown -- Budget service extension for store-level tracking
   - DRI: Backend engineer
   - Dependencies: Store tracking in item creation flow
   - Success criteria: Users see "Wet market: 3,000. Big C: 2,500. Villa Market: 1,800."

10. **[Medium-term]** Item usage history activation -- Write usage events, enable depletion patterns
    - DRI: Backend engineer
    - Dependencies: Usage history schema (exists)
    - Success criteria: System begins accumulating usage data for future prediction features

---

## Appendix: Source Files Reviewed

**Documentation:**
- `/docs/business/product-model-canvas.md`
- `/docs/business/pitch-deck.md`
- `/docs/personas/icp.md`
- `/docs/personas/pixie-persona.md`
- `/docs/phase-plan/overview.md`

**Core Package:**
- `packages/core/src/types/index.ts`
- `packages/core/src/constants.ts`
- `packages/core/src/pixie/intents.ts`
- `packages/core/src/pixie/prompts.ts`
- `packages/core/src/schema/items.ts`
- `packages/core/src/schema/homes.ts`
- `packages/core/src/schema/grocery-list.ts`
- `packages/core/src/schema/chat.ts`

**Web Package -- Server:**
- `packages/web/src/server/api/index.ts`
- `packages/web/src/server/agent/index.ts`
- `packages/web/src/server/agent/tools/*.ts`
- `packages/web/src/server/services/chat.ts`
- `packages/web/src/server/services/budget.ts`

**Web Package -- Client:**
- `packages/web/src/client/pages/(app)/chat.tsx`
- `packages/web/src/client/pages/(app)/list.tsx`
- `packages/web/src/client/pages/(app)/settings.tsx`
- `packages/web/src/client/pages/onboarding.tsx`
- `packages/web/src/client/components/list/BudgetCard.tsx`

---

**Document Version:** 1.0
**Review Frequency:** After each phase completion
**Next Review:** End of Phase 1 (Week 8)
