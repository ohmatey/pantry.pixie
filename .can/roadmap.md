# Pantry Pixie — Work Queue

> Spun out after PR #56 (Phase 3 intelligence + receipt scanning + UX hardening merged to `main`).
> Offline queue (sector137 MCP not connected) — promote to Sal issues when it reconnects.

## now
- (cleared — the core-user-journey batch shipped 2026-05-25; see "done (recent)". Promote from "next" when picking up the next sprint.)

## next
- [ ] **Seasonal (Thai) awareness** — static seasonal/festival calendar injected into Pixie's context + seasonal meal/restock nudges. Last unbuilt Phase 3 intelligence item; lightweight and on-brand for Bangkok.
- [ ] **Notifications real-time push** — unread badge updates over WebSocket instead of the current ~60s poll.

## later
- [ ] **Phase 4 kickoff — Bill & utility reminders** — next household domain; builds directly on the notifications + scheduler backbone. Then subscriptions / home-supplies tracking.
- [ ] **Prune the obsolete LINE section** from `docs/phase-plan/phase-4-expansion.md` (currently banner-marked removed-from-scope).
- [ ] **Receipt parsing hardening** — blurry/long/multi-page receipts; consider a dedicated OCR fallback if real-world vision accuracy proves insufficient.
- [ ] **Value-add / premium tier** — Phase 4 monetization design.

## done (recent)
- [x] Launch-readiness batch (2026-05-25): **persist invite codes** (new `invite_codes` table; invites survive server restart) · **re-issue JWT on invite-accept** (token's homeId now matches the joined home; deterministic login prefers the joined home; `resolveHomeId` workaround removed)
- [x] Core-user-journey batch (2026-05-25): mobile bottom nav (4 tabs + More) · calm notifications (coalesced partner-activity digest + per-user quiet toggles) · receipts history + "view receipt" (new `receipts` table, single confirm funnel) · receipt scan in chat (inline review card, reuses scan+confirm)
- [x] Phase 3 Batch 1 — purchase-pattern learning + depletion prediction (low-stock alerts, Pixie tool, pantry banner)
- [x] Phase 3 Batch 2 — non-judgmental budget insights (trends, category + budget-vs-actual, Spending page)
- [x] Receipt scanning — vision parse → review → bulk-add with prices + store; spend-by-store breakdown; manual quick-add
- [x] Actionable low-stock notifications ("Add to list")
- [x] Removed LINE integration from the roadmap
