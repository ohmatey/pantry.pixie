# Pantry Pixie

## Domestic life, handled.

---

## Slide 1: The Problem

Every couple has this fight.

"Did you get olive oil?"
"I thought you were getting it."
"We literally talked about this."

**One partner carries the invisible mental load of running a home.** The other doesn't realize how much thinking goes into "just buying groceries."

In Bangkok, this gets worse:

- Shopping is fragmented across 4-6 store types (wet market, Big C, Villa Market, Makro, 7-Eleven, GrabMart)
- One partner shops daily at markets. The other wants a weekly plan.
- Spending mixes cheap local staples (฿40 coriander) with expensive imports (฿300 olive oil)
- No single receipt. No shared visibility. Just a monthly credit card statement and mild resentment.

**This isn't a grocery problem. It's a cognitive load problem.**

---

## Slide 2: The Hidden Cost

Mental load isn't tracked, but it's expensive.

- **70% of household cognitive labor** falls on one partner (usually women) — *Eve Rodsky, Fair Play*
- **Grocery-related disagreements** are a top-5 recurring argument for cohabiting couples
- **฿3,000–8,000/week** spent on groceries by dual-income Bangkok couples — with near-zero shared visibility
- The person who "handles it" burns decision energy. The person who doesn't feels excluded or blindsided by the bill.

**Neither partner is wrong. The system is missing.**

---

## Slide 3: Existing Solutions Don't Solve This

| Category | What They Do | What They Miss |
|----------|-------------|----------------|
| **Grocery apps** (GrabMart, Happy Fresh) | Optimize delivery logistics | Don't coordinate between two people |
| **Budget apps** (YNAB, Money Lover) | Track spending after the fact | Don't reduce the thinking beforehand |
| **List apps** (Todoist, Google Keep) | Store tasks | Don't generate, automate, or mediate |
| **Meal planners** | Plan recipes | Don't handle the actual shopping coordination |

**No tool manages the intent layer** — the thinking that happens before the list, between two people with different shopping styles.

---

## Slide 4: Introducing Pantry Pixie

**The AI steward for your shared home.**

Pantry Pixie is a conversational AI agent — "Pixie" — that sits between you and your partner to manage grocery coordination.

She:

- Learns what your household needs and when
- Generates weekly grocery drafts automatically
- Lets both partners add items conversationally ("We need eggs and nam pla")
- Tracks recurring items and nudges when you're likely running low
- Provides budget awareness without judgment
- Syncs everything in real-time — both of you always see the same list

**She doesn't order groceries. She removes the thinking.**

---

## Slide 5: How It Works

**1. Create a Home**
Sign up, name your home ("Bangkok Nest"), invite your partner.

**2. Talk to Pixie**
"We need jasmine rice and Thai basil."
→ Pixie extracts items, adds to this week's draft.
→ "Added. Rice stability restored."

**3. Automate the Recurring**
"Add fish sauce monthly."
→ Pixie schedules it. It appears in future drafts automatically.

**4. Sunday Sync**
Pixie: "Weekly draft ready. Two minutes?"
→ Both partners review, adjust, approve. Done.

**5. Shop However You Want**
Market, Big C, GrabMart — doesn't matter. Mark items purchased. Pixie keeps everyone in sync.

---

## Slide 6: The Pixie Difference

Pixie isn't a chatbot. She's a domestic presence.

**What she says:**
- "Milk situation detected. Want me to handle it?"
- "This week leaned snack-forward. Still within comfort range."
- "History suggests we may want olive oil."
- "Handled."

**What she never says:**
- "You forgot the milk again."
- "You exceeded your budget."
- "Aaron added expensive cheese."

**Core principle: Neutrality preserves harmony.**

She never reveals who added what in a blaming way. She never shames spending. She never takes sides.

---

## Slide 7: Why Bangkok First

Bangkok is the ideal launch market for domestic AI:

- **High digital adoption**: 95%+ smartphone penetration, LINE-native culture
- **Fragmented grocery ecosystem**: Multiple store types create coordination complexity that doesn't exist in single-supermarket Western markets
- **Growing dual-income households**: Bangkok's middle class is expanding rapidly
- **Expat density**: Large international community navigating unfamiliar grocery systems
- **Lower operating costs**: Build and validate cheaply before scaling
- **Underserved by Western tools**: No localized domestic coordination products exist

**SEA expansion path**: Bangkok → Kuala Lumpur → Singapore → Ho Chi Minh City → Jakarta

---

## Slide 8: Product Architecture

```
┌─────────────────────────────────────────────┐
│              Pantry Pixie Platform           │
├──────────┬──────────┬───────────┬───────────┤
│  PWA     │   SDK    │   CLI     │  Agent    │
│  (MVP)   │  (npm)   │ (terminal)│ Protocol  │
├──────────┴──────────┴───────────┴───────────┤
│            @pantry-pixie/core               │
│     Entities · Types · Pixie Personality     │
├─────────────────────────────────────────────┤
│  Bun Runtime · Mastra.ai · Postgres · WS    │
└─────────────────────────────────────────────┘
```

- **Open source core** — MIT licensed, community-driven
- **PWA first** — installable on any phone, no app store needed
- **SDK + CLI** — developers can build on top of Pixie
- **Agent protocol** — other AI agents can call Pixie as a tool (OpenClaw compatible)
- **Stack**: Bun (fast), Mastra.ai (agent orchestration), Postgres (reliable), WebSockets (real-time)

---

## Slide 9: Business Model

**Phase 1: Open Source Foundation** (Months 1-6)
- Free, MIT-licensed core
- Build community, validate with real couples
- Founder + partner are the first users

**Phase 2: Freemium** (Months 7-12)
- Basic Pixie: Free (list management, conversational add, sync)
- Premium Pixie: ฿99-299/month
  - Smart purchase predictions
  - Multi-store optimization
  - Advanced budget insights
  - Priority AI responses

**Phase 3: Platform Revenue** (Year 2+)
- Store integration referral fees (GrabMart, LINE MAN, Shopee)
- API access for agent-to-agent usage
- Enterprise/family plans
- White-label domestic AI for property developers

---

## Slide 10: Market Opportunity

**Bangkok alone:**
- ~160,000 dual-income households with grocery coordination friction
- ฿3,000-8,000/week average grocery spend = ฿25B+ annual grocery market in target segment

**Southeast Asia:**
- 680M population, rapidly growing middle class
- Fragmented grocery markets across every major city
- Mobile-first, high digital adoption
- No dominant domestic coordination tool

**Category creation: Domestic Cognitive Automation**
- Not competing with grocery delivery (logistics)
- Not competing with budgeting apps (finance)
- Not competing with list apps (productivity)
- Creating a new category: the AI layer that sits between people in a shared home

---

## Slide 11: Traction & Roadmap

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| **0: Foundation** | Weeks 1-3 | Monorepo, schema, Pixie agent, auth, WebSocket |
| **1: MVP PWA** | Weeks 4-8 | Working PWA used by founder + partner daily |
| **2: SDK & CLI** | Weeks 9-12 | npm packages, agent protocol, dev community |
| **3: Intelligence** | Weeks 13-18 | Purchase learning, smart suggestions, budget insights |
| **4: Expansion** | Weeks 19-26 | LINE integration, store APIs, multi-language, premium tier |

**Key metric**: Weekly Active Homes (WAH)
- Month 3: 50 WAH (friends & community)
- Month 6: 500 WAH (Bangkok early adopters)
- Month 12: 5,000 WAH (SEA expansion begins)
- Month 18: 10,000+ WAH

---

## Slide 12: Competitive Positioning

**Against grocery apps:** They optimize logistics. We optimize harmony.

**Against budgeting apps:** They optimize numbers. We optimize mental load.

**Against list apps:** They store tasks. We remove thinking.

**Against general AI assistants:** They respond to commands. Pixie anticipates needs.

**Our moat:**
- Open source trust (critical for a product touching money + relationships)
- Behavioral branding (Pixie is a character, not a feature)
- Agent interoperability (composable, not siloed)
- Founder-in-market (building what we use daily)

---

## Slide 13: What We Will Never Do

Restraint is the moat.

- **Never shame spending** — "Budget exceeded" becomes "This week leaned snack-forward"
- **Never use fear-based messaging** — no red alerts, no "URGENT" notifications
- **Never overwhelm with analytics** — calm insights, not dashboards
- **Never gamify chores** — no points, no streaks, no leaderboards
- **Never become a cartoon brand** — Pixie is subtle magic, not a fairy princess
- **Never reveal "who did what" in a blaming way** — neutrality is non-negotiable

These constraints aren't limitations. They're what makes couples trust Pixie inside their shared economy.

---

## Slide 14: The Team

**Aaron McPherson** — Founder
- Based in Bangkok
- Building what he needs: a way to coordinate groceries with his partner without the weekly tension
- Technical background — building the entire V1
- First user, first tester, first customer

*"My girlfriend enjoys walking through markets deciding what looks good. I want to know what we need and what it'll cost. Neither of us is wrong. We just needed Pixie."*

---

## Slide 15: The Ask

**Right now:** Building in public, open source.

**What accelerates this:**
- Early adopter couples in Bangkok willing to use V1
- Contributors to the open source project
- Connections to Thai grocery/delivery platforms
- Angel investment for AI inference costs + dedicated development time

**Contact:** contactaaronmcpherson@gmail.com
**GitHub:** (coming soon)

---

## Slide 16: One Last Thing

If a user says:

> "Pixie handled it."

The brand is working.

If they say:

> "I updated the grocery list app."

It's not.

That's the difference between a tool and a domestic presence.

**Pantry Pixie. Your home, handled.**
