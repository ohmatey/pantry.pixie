# Pantry Pixie — Work Queue

> Spun out after PR #56 (Phase 3 intelligence + receipt scanning + UX hardening merged to `main`).
> Offline queue (sector137 MCP not connected) — promote to Sal issues when it reconnects.

## now
- [ ] **Mobile bottom nav + promote Spending & Activity** — UX review found core jobs (spend visibility J2, partner activity J5) buried in the avatar dropdown, and there's no bottom tab bar for one-handed phone use. Move them into a bottom nav.
- [ ] **Calm notifications** — today every item add notifies the partner ("surveillance" risk that undercuts the non-judgment value, J6). Batch/throttle partner-activity and add per-type quiet toggles in settings.
- [ ] **Receipts history + "view receipt"** — persist receipt metadata (merchant/date/total/items) so spend is auditable: Aaron's "what was this ฿X charge?" job + total-vs-items reconciliation. (Receipt scan currently bulk-adds items but keeps no receipt record.)
- [ ] **Receipt scan in chat** — let users send a receipt photo to Pixie (vision tool in the agent), so the headline feature also works conversationally, not just from the pantry button.

## next
- [ ] **Seasonal (Thai) awareness** — static seasonal/festival calendar injected into Pixie's context + seasonal meal/restock nudges. Last unbuilt Phase 3 intelligence item; lightweight and on-brand for Bangkok.
- [ ] **Notifications real-time push** — unread badge updates over WebSocket instead of the current ~60s poll.
- [ ] **Persist invite codes** — they live in memory and are lost on server restart. Must-fix before any real launch.
- [ ] **Re-issue JWT on invite-accept** — so the token's `homeId` matches the active (joined) home. Root-cause fix behind the `resolveHomeId` workaround in the preferences endpoint.

## later
- [ ] **Phase 4 kickoff — Bill & utility reminders** — next household domain; builds directly on the notifications + scheduler backbone. Then subscriptions / home-supplies tracking.
- [ ] **Prune the obsolete LINE section** from `docs/phase-plan/phase-4-expansion.md` (currently banner-marked removed-from-scope).
- [ ] **Receipt parsing hardening** — blurry/long/multi-page receipts; consider a dedicated OCR fallback if real-world vision accuracy proves insufficient.
- [ ] **Value-add / premium tier** — Phase 4 monetization design.

## done (recent)
- [x] Phase 3 Batch 1 — purchase-pattern learning + depletion prediction (low-stock alerts, Pixie tool, pantry banner)
- [x] Phase 3 Batch 2 — non-judgmental budget insights (trends, category + budget-vs-actual, Spending page)
- [x] Receipt scanning — vision parse → review → bulk-add with prices + store; spend-by-store breakdown; manual quick-add
- [x] Actionable low-stock notifications ("Add to list")
- [x] Removed LINE integration from the roadmap
