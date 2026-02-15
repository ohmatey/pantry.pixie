# Pantry Pixie: Project Phase Plan Overview

## Executive Summary

Pantry Pixie is an open-source domestic AI steward product designed to coordinate household grocery and pantry management through conversational AI. This document provides a high-level roadmap spanning 26 weeks (approximately 6 months) from foundation through platform expansion.

**Initial Market:** Bangkok, Thailand
**Core Technology Stack:** Bun + Mastra.ai + Postgres + WebSockets
**Deployment Targets:** SDK, CLI, Web App (PWA), Agent-accessible
**Business Model:** Open-source foundation with value-add monetization layer

---

## Phase Overview

### Phase 0: Foundation (Weeks 1-3)
**Goal:** Build the technical foundation and core infrastructure
**Outcome:** Functional monorepo with database schema, authentication, AI agent framework, and API
**Key Deliverables:**
- Monorepo structure (Bun workspace)
- Drizzle ORM + Postgres schema
- JWT authentication
- Mastra.ai Pixie agent framework
- WebSocket infrastructure
- CRUD API endpoints
- CI/CD pipeline

### Phase 1: MVP Web App / PWA (Weeks 4-8)
**Goal:** Launch a functional PWA that enables core household coordination
**Outcome:** Installable web app with real-time multi-user grocery list management
**Key Deliverables:**
- Progressive Web App (service worker, offline capability)
- Mobile-first UI (Sage green + warm cream + charcoal branding)
- Onboarding flow (create home, invite partner, Pixie intro)
- Chat interface with Pixie agent
- Grocery list management with state transitions
- Real-time synchronization via WebSocket
- Sunday Sync ritual
- Budget awareness (informational, non-judgmental)

### Phase 2: SDK & CLI (Weeks 9-12)
**Goal:** Provide programmatic and terminal access to Pantry Pixie
**Outcome:** TypeScript SDK and CLI tool, plus agent-to-agent protocol
**Key Deliverables:**
- @pantry-pixie/sdk package (programmatic API)
- @pantry-pixie/cli package (terminal interface)
- Agent-to-agent protocol specification
- OpenClaw integration hooks
- npm package publishing

### Phase 3: Intelligence Layer (Weeks 13-18)
**Goal:** Add predictive and adaptive features based on household patterns
**Outcome:** Smart suggestions, pattern learning, and enhanced Pixie personality
**Key Deliverables:**
- Purchase pattern learning engine
- Depletion prediction model
- Seasonal awareness (Thai context)
- Multi-store awareness
- Budget insights (non-judgmental)
- Enhanced notification system
- Contextual Pixie responses

### Phase 4: Platform Expansion (Weeks 19-26)
**Goal:** Expand into related domains and monetization
**Outcome:** Multi-domain home steward, premium tier, third-party integrations
**Key Deliverables:**
- Subscriptions + home supplies tracking
- Bill/utility reminders
- LINE integration (Thailand-focused)
- E-commerce integrations (GrabMart, Shopee, LINE MAN)
- Multi-language support (Thai + English)
- Community and plugin ecosystem
- Value-add tier design

---

## Timeline & Milestones

| Week | Phase | Milestone | Decision Point |
|------|-------|-----------|-----------------|
| 1-3 | 0 | Foundation complete | Go/no-go on tech stack |
| 4-8 | 1 | MVP PWA launched | Soft launch to private users |
| 9-12 | 2 | SDK + CLI released | Open source public release |
| 13-18 | 3 | Intelligence layer live | Freemium model validation |
| 19-26 | 4 | Platform expansion | Pivot to value-add monetization |

---

## Dependencies & Sequencing

```
Phase 0 (Foundation)
  ├─ Database schema → Required for Phase 1-4
  ├─ Auth system → Required for Phase 1+
  ├─ Mastra.ai framework → Required for Phase 1+
  └─ WebSocket infrastructure → Required for Phase 1+

Phase 1 (MVP Web)
  ├─ Must complete Phase 0
  ├─ Unblocks Phase 2 (SDK extraction)
  └─ Provides user feedback for Phase 3 (intelligence)

Phase 2 (SDK & CLI)
  ├─ Depends on Phase 1 completion
  ├─ Enables Phase 4 (third-party integrations)
  └─ No blocking relationship

Phase 3 (Intelligence)
  ├─ Depends on Phase 1 real-world data
  ├─ Can start learning layer design in parallel
  └─ Integrates with Phase 4 (expanded domains)

Phase 4 (Expansion)
  └─ Depends on Phase 1-2, informed by Phase 3
```

---

## Key Risks & Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Mastra.ai integration complexity | Phase 0-1 blockers | Medium | Build proof-of-concept early; document API surface |
| WebSocket scalability | Real-time sync issues | Medium | Load test with 10+ homes; consider Redis pub/sub for Phase 2+ |
| Postgres schema evolution | Data migration burden | High | Use Drizzle migrations from day 1; version schema carefully |
| PWA offline sync conflicts | Data corruption risk | High | Implement conflict-free replicated data types (CRDTs) or vector clocks |

### Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Poor Pixie UX (AI responses) | Low user adoption | Medium | Weekly UX testing; iterate on prompt engineering |
| Multi-user friction (disagreements on shopping) | Churn | High | Design collaborative features (approvals, shared drafts) |
| Thailand-specific feature gaps | Market-specific failure | Medium | Integrate with local payment/logistics early (Phase 2+) |
| Open source → monetization transition | Community backlash | Low-Medium | Be transparent on value-add vs. core; maintain free tier |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Competing AI tools (OpenClaw, etc.) | Reduced differentiation | High | Focus on domain-specific value (household coordination); integrate as protocol |
| Low initial market | Revenue uncertainty | Medium | Start with friends/family beta; gauge product-market fit before Phase 4 |

---

## Team & Roles

### Immediate (Phase 0-1)
- **Founder/Tech Lead**: Architecture, API, agent framework, WebSocket
- **Frontend Engineer**: PWA, UI/UX, real-time sync
- **DevOps/DBA**: Database schema, CI/CD, infrastructure
- *Estimate: 1-2 people part-time, or 1 person full-time with heavy focus*

### Phase 2+ (As capacity allows)
- **SDK/CLI Developer**: Abstraction layer, npm publishing
- **ML Engineer**: Purchase pattern learning, depletion modeling
- **Community Manager**: Open source coordination, documentation

### Phase 4+ (Expansion)
- **Integration Engineer**: LINE, GrabMart, Shopee APIs
- **Product Manager**: Freemium model, premium features
- **Localization Lead**: Thai language support, cultural adaptation

---

## Open Source & Monetization Path

### Foundation: Open Source First
- All Phase 0-2 deliverables open-source from launch
- MIT or Apache 2.0 license
- Clear CONTRIBUTING.md for community
- Public roadmap; transparent decision-making

### Transition to Value-Add (Phase 3-4)
- **Freemium Core**: Grocery list, Pixie chat, basic insights (always free)
- **Premium Features** (Phase 4):
  - Advanced analytics (spending trends, seasonal patterns)
  - Bill/utility tracking
  - Multi-store recommendations
  - White-label SDK for household apps
  - Priority Pixie customization (personality, tone, integrations)
- **Institutional**: Bulk user licensing for property managers, care facilities

### Community Sustainability
- Open source remains the trust foundation
- Premium is additive, not restrictive
- Community features (recipes, tips) free
- Sponsorship/donation option via GitHub Sponsors

---

## Decision Points & Go/No-Go Criteria

### End of Phase 0
**Go Criteria:**
- [ ] Monorepo builds and deploys via CI/CD
- [ ] Mastra.ai integration proof-of-concept functional
- [ ] Database schema passes 1-month retention test (no major changes needed)
- [ ] WebSocket can handle 10+ concurrent connections with <100ms latency

**No-Go Triggers:**
- Mastra.ai API fundamentally incompatible with household AI needs
- Postgres schema redesign needed (re-examine data model)

---

### End of Phase 1
**Go Criteria:**
- [ ] PWA installable on iOS + Android
- [ ] Onboarding flow <3 minutes end-to-end
- [ ] Real-time sync latency <500ms (99th percentile)
- [ ] 5+ beta users with >50% weekly active rate
- [ ] Pixie responds sensibly to 80%+ of conversational inputs

**No-Go Triggers:**
- Offline sync conflicts unresolvable
- Pixie UX fundamentally misaligned with household dynamics
- WebSocket architecture requires major refactor for scale

---

### End of Phase 2
**Go Criteria:**
- [ ] SDK + CLI cover 90% of web app functionality
- [ ] 50+ GitHub stars on public release
- [ ] Agent-to-agent protocol enables ≥1 external integration (OpenClaw)
- [ ] npm packages >100 downloads/week

**No-Go Triggers:**
- Weak community interest (no external contributions)
- Agent protocol too rigid or inflexible for real-world use

---

### End of Phase 3
**Go Criteria:**
- [ ] Intelligence layer predicts 70%+ accuracy for recurring items
- [ ] Notification system achieves <5% spam report rate
- [ ] Freemium adoption: >20% of users engage premium previews

**No-Go Triggers:**
- Pattern learning accuracy insufficient for real-world use
- Premium model resonates poorly with users

---

### End of Phase 4
**Go Criteria:**
- [ ] Bill/utility tracking validates >$5K potential TAM
- [ ] LINE integration captures >30% Thai user base
- [ ] Plugin ecosystem: ≥3 third-party extensions
- [ ] Premium revenue: >2x operating costs

**No-Go Triggers:**
- Expansion dilutes core product focus
- Integration complexity prevents continued open-source maintenance

---

## Success Metrics (Overall)

### Phase 0-1 (Product-Market Fit)
- **Retention**: 70%+ weekly active from initial cohort
- **Engagement**: Average 3+ interactions per user per week
- **Time-to-value**: <5 minutes from signup to first list item

### Phase 2 (Community Growth)
- **GitHub**: 200+ stars, 10+ contributors
- **Adoption**: 1K+ monthly active users
- **Distribution**: SDK + CLI covering 80% of use cases

### Phase 3-4 (Monetization Validation)
- **Freemium Conversion**: 10%+ to premium
- **Revenue**: Sustainable operational costs
- **Platform**: 3+ strategic integrations

---

## Technical Decision Log

### Approved
- **Bun as runtime**: Performance, all-in-one tooling (build, test, package)
- **Mastra.ai for agent framework**: LLM-agnostic, structured outputs, easy function calling
- **Drizzle ORM**: Type-safe, migration-first, minimal runtime overhead
- **WebSocket for real-time**: Lower latency than polling; handles household coordination latency needs
- **JWT for auth**: Stateless; works with distributed systems; easily extensible to OAuth

### Pending Decision
- CRDT vs. Vector Clock for offline sync conflict resolution (Phase 1)
- Postgres jsonb vs. normalized schema for flexible attributes (Phase 1)
- Monorepo: Turborepo vs. Bun workspace vs. pnpm (Phase 0)

---

## External Dependencies & Partnerships

### Phase 0
- **Mastra.ai**: Agent framework
- **PostgreSQL**: Database
- **Bun**: Runtime

### Phase 1-2
- **Vercel / Netlify**: PWA hosting (optional; can self-host)
- **Auth0 / Clerk**: OAuth (Phase 2+, if pursuing that path)

### Phase 4
- **LINE Developers**: LINE integration (Thailand)
- **GrabMart / Shopee API**: E-commerce integrations
- **OpenClaw**: Agent-to-agent protocol (if applicable)

---

## Documentation & Communication Plan

| Audience | Frequency | Format | Owner |
|----------|-----------|--------|-------|
| Team | Daily | Standup (async Slack) | Tech Lead |
| Contributors | Weekly | GitHub Discussions + Releases | Community Manager |
| Users | Monthly | Changelog + blog post | Product Manager |
| Investors (if applicable) | Monthly | Metrics dashboard + written update | Founder |

---

## Appendix: Glossary

- **Pixie**: The conversational AI agent managing household coordination
- **Home**: A household unit with 1+ HomeMembers
- **HomeMember**: A user with membership in a Home
- **GroceryList**: A list of ItemIds with state (draft, approved, completed)
- **ChatThread**: A conversation thread with Pixie; context for agent responses
- **CRDT**: Conflict-free replicated data type (for offline sync)
- **PWA**: Progressive Web App (installable web app with offline support)
- **Value-add**: Premium features that enhance core product without paywalling it

---

## Next Steps

1. **Immediately (Week 0):** Validate tech stack with founder; finalize Mastra.ai integration approach
2. **Week 1:** Begin Phase 0; establish monorepo structure and database schema
3. **Week 4:** Begin Phase 1; start PWA development and first user testing
4. **Week 9:** Begin Phase 2; plan SDK/CLI public launch
5. **Week 13:** Begin Phase 3; design intelligence layer based on Phase 1 user data

---

**Document Version:** 1.0
**Last Updated:** 2026-02-15
**Status:** Approved for Phase 0 Kick-off
