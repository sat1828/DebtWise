<div align="center">

![DebtWise](./assets/readme/banner.svg)

<br/>

**Debt collectors bank on you not knowing the law.**
**This app closes that gap — before the first call.**

DebtWise is a full-stack TypeScript application that calculates your exact statute of limitations, scores your legal leverage 0–100, detects FDCPA violations in your contact history, generates seven distinct pre-filled legal letter templates, and coaches you through collector calls in real time via WebSocket. Built entirely without a legal database subscription — just code, law, and the right data structures.

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5_%2F_5.4-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21.0-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7.5-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Zod](https://img.shields.io/badge/Zod-3.23.8-3068b7?style=flat-square)](https://zod.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4.4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-4.5.4-ff6b00?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.48.0-ef4444?style=flat-square)](https://tanstack.com/query)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

---

## The Flow

![User Flow](./assets/readme/userflow.svg)

Add a debt → AI calculates SOL, risk score, violations → know your position → generate documents → get live coached on the call → track to settlement.

---

## Dashboard

![Dashboard](./assets/readme/dashboard.svg)

Two debts ship with the demo account. **Capital One** ($4,785.43 — `credit_card`, `status: disputed`, 2 FDCPA violations, `legal_risk_score: 35`, SOL expires 2028-04-01). **Sutter Health** ($5,400.00 — `medical`, `status: time_barred`, `is_time_barred: 1`, `legal_risk_score: 15`, SOL expired 2024-01-15). Both seeded with real violations, deadlines, and an AI thread.

---

## AI Debt Analysis

![Analysis](./assets/readme/analysis.svg)

`runDebtAnalysis(debt, state)` — the entire intelligence layer. Reads `date_of_default` or `date_of_last_payment`, looks up `SOL_TABLE[state][debt_type]`, computes `solExpiry`, scores 0–100, detects violations from `collector_violations` JSON, picks settlement percentages, and returns a `DebtAnalysis` object with a full markdown summary.

---

## Negotiation Wizard + Live Call Coach

![Negotiation](./assets/readme/negotiation.svg)

Five steps. Step 5 activates `Socket.IO`. The collector says something → you type it → `call:transcript` fires → server waits 800ms → `call:suggestion` returns a verbatim phrase with its legal justification. Four response patterns, zero vagueness.

---

## Know Your Rights

![Rights](./assets/readme/rights.svg)

Six sections. The SOL table on the right pulls directly from the same `SOL_TABLE` constant used by `runDebtAnalysis()` — 16 states, every debt type, hardcoded and exact.

---

## System Architecture

![Architecture](./assets/readme/architecture.svg)

---

## Why This Was Built

People receiving collection notices either ignore them or pay in full. Neither is optimal. The information gap is real:

- A debt may be **time-barred** — the collector cannot sue, period
- Collectors may have already **violated FDCPA** — worth up to **$1,000 per violation** in statutory damages under § 1692k
- Even **$1 paid** can restart the SOL clock in most states  
- Realistic settlement on distressed consumer debt is **15–50% of the claimed amount**

DebtWise makes all of this visible before the conversation starts.

---

## Feature Breakdown

### 🤖 AI Engine — `server/src/ai/debtAnalysis.ts`

The entire intelligence layer lives in one file. No external LLM call for analysis — pure computation on the seeded constants.

**`SOL_TABLE`** — exact values, 16 states + `default`:

| State | `credit_card` | `medical` | `auto_loan` | `student_loan` | `mortgage` |
|---|---|---|---|---|---|
| `CA` | 4 | 3 | 4 | 4 | 4 |
| `NY` | 3 | 3 | 4 | 3 | 6 |
| `FL` | 5 | 5 | 5 | 5 | 5 |
| `TX` | 4 | 4 | 4 | 4 | 4 |
| `IL` | 5 | 5 | 5 | 5 | **10** |
| `OH` | 6 | 6 | 6 | 6 | 6 |
| `GA` | 4 | 4 | 4 | 4 | **6** |
| `NC` | 3 | 3 | 3 | 3 | 3 |
| `MI` | 6 | 6 | 6 | 6 | 6 |
| `PA` | 4 | 4 | 4 | 4 | 4 |
| `NJ` | 6 | 6 | 6 | 6 | 6 |
| `VA` | 3 | 3 | 4 | 3 | **5** |
| `WA` | 4 | 4 | 4 | 4 | **6** |
| `AZ` | 4 | 4 | 4 | 4 | **6** |
| `CO` | 6 | 6 | 6 | 6 | 6 |
| `MA` | 6 | 6 | 6 | 6 | 6 |
| `default` | 4 | 4 | 4 | 4 | 4 |

**`STATE_LAWS`** — three states with extra-federal protections:
- `CA` → `California Rosenthal Fair Debt Collection Practices Act (Cal. Civ. Code §§ 1788 et seq.)` — extends FDCPA to original creditors
- `FL` → `Florida Consumer Collection Practices Act (FCCPA, Fla. Stat. §§ 559.55 et seq.)`
- `NY` → `New York Consumer Credit Fairness Act (CCFA)` — 3-year SOL for credit cards

**Risk Score algorithm — exact from source:**
```
base = 50
isTimeBarred → -30
else → +Math.max(0, Math.min(30, Math.round((1 - remainingYears / solYears) * 30)))
status === 'valid'    → +10
status === 'disputed' → -10
per violation in log  → -5
amount < 1000         → -10
amount > 10000        → +10
clamp(0, 100)
```

**Settlement range — exact from source:**
```
isTimeBarred → low = amount × 0.15,  high = amount × 0.30  (15–30%)
live debt    → low = amount × 0.30,  high = amount × 0.50  (30–50%)
```

**`runDebtAnalysis(debt, state): Promise<DebtAnalysis>`** — 800ms artificial delay. Parses `collector_violations` JSON array from `debt.collector_violations`. Returns:

```typescript
interface DebtAnalysis {
  status: DebtStatus;
  solExpiresOn: string | null;           // "YYYY-MM-DD"
  isTimeBarred: boolean;
  riskScore: number;                     // 0–100
  violations: Violation[];
  summary: string;                       // full markdown report
  validationStatus: string;             // 'time_barred' | 'disputed' | 'needs_validation'
  settlementRange: {
    low: number;
    high: number;
    percentage: string;                  // e.g. "30%–50%"
  };
  recommendedActions: string[];
}
```

**`generateDocumentContent(type, debt, analysis, user): Promise<string>`** — 7 template keys, all pre-filled:

| Type | When to use |
|---|---|
| `debt_validation_request` | Within 30 days of first collector contact |
| `cease_and_desist` | Stop all contact · time-barred language if `isTimeBarred` |
| `settlement_offer` | Formal offer · written-confirmation condition · no-SOL-restart clause |
| `dispute_letter` | Challenge amount, ownership, chain of custody |
| `violation_complaint` | Cite violations by statute · demand § 1692k damages or settlement |
| `call_script` | Verbatim script · opening · offer · counter · forbidden phrases · post-call checklist |
| `payment_plan_proposal` | Monthly plan · interest-freeze · no-restart conditions |

Every document ends with: *`TEMPLATE — Verify all facts before sending. DebtWise is not your attorney.`*

**`getChatResponse(messages, debtContext, userState): Promise<string>`** — 500ms delay. Intent-matches on `settle/offer`, `statute/sol/time-bar`, `call/phone`, `dispute/validation` and returns contextual coaching. Falls back to a feature overview.

---

### 📞 Call Companion — Socket.IO `server/src/index.ts`

```
Client                                     Server
  │                                            │
  ├─ call:join { userId, debtId } ───────────►│ socket.join(`user:${userId}`)
  │                                            │ socket.join(`debt:${debtId}`)
  │◄─ call:ready { message } ─────────────────┤ "DebtWise Call Companion active..."
  │                                            │
  ├─ call:transcript { text } ───────────────►│ setTimeout(800ms)
  │◄─ call:suggestion {                        │ random pick from 4 responses
  │     suggested: string,                     │
  │     reason: string                         │
  │   } ───────────────────────────────────────┤
```

Four hardcoded response patterns:
1. `"I need to review that in writing before I can agree."` — never accept verbal terms
2. `"Can you please send me documentation of what you're claiming?"` — FDCPA § 1692g right
3. `"I'm not able to discuss payment methods over the phone."` — never give bank info on a call
4. `"I understand. Please note our conversation for your records."` — stay neutral, document everything

---

### 🧙 Negotiation Wizard

Five steps, one `NegotiationGoal` drives everything:

```typescript
type NegotiationGoal =
  | 'full_settlement'     // lump-sum · settlement at 30–50%
  | 'payment_plan'        // monthly · interest-freeze · no SOL restart
  | 'dispute_validity'    // amount, ownership, chain of custody
  | 'cease_and_desist'    // § 1692c(c) — stop all contact
  | 'statute_defense'     // time-barred · cannot sue
  | 'violation_leverage'; // § 1692k — $1,000/violation as ammo

type SessionStatus = 'open' | 'offer_made' | 'counter_received' | 'settled' | 'abandoned';
```

Step 2 computes `discretionaryIncome = monthlyIncome - monthlyExpenses` → "power number." Step 5 activates Call Companion, contact log (`date`, `contactPerson`, `notes`, `outcome`), and status updates.

---

### ⏰ Deadlines

Five `DeadlineType` values, seeded with two real entries:

| Type | Description | Seeded |
|---|---|---|
| `fdcpa_dispute_window` | 30-day validation window | ✓ debt1 · 2024-02-09 |
| `response_to_lawsuit` | Court summons response | — |
| `statute_of_limitations_reset_risk` | Any payment risk warning | ✓ debt2 · 2024-03-01 |
| `settlement_offer_expiry` | Sent offer expiry | — |
| `credit_report_dispute_followup` | 30-day FCRA investigation | — |

---

### ⚖️ Rights Hub

Six tabbed sections — `FDCPA`, `SOL`, `Debt Validation Rights`, `Credit Reporting`, `State Laws`, `When to Get a Lawyer`. FDCPA section cites all 10 relevant subsections by number. SOL table sourced from `SOL_TABLE`. State laws pull from `STATE_LAWS`. Litigation section references NACA (naca.net) and state bar referral services with specific triggers: lawsuit filed, judgment entered, wage garnishment, debt over $25k, collector represented by counsel.

---

## Project Structure

```
DebtWise/
├── package.json                        # version 1.0.0 · concurrently ^8.2.2
│                                       # scripts: dev · build · start · dev:server · dev:client
├── client/                             # debtwise-client v1.0.0 · node >=18
│   ├── vite.config.ts                  # proxy /api → :3001 in dev
│   ├── tailwind.config.js              # debtwise (indigo 50–950) + accent (teal 50–900)
│   │                                   # darkMode: 'class' · JetBrains Mono display font
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx                     # QueryClient(staleTime:30000, retry:1, refetchOnWindowFocus:false)
│       │                               # PublicRoute · ProtectedRoute · 5 public + 4 protected paths
│       ├── api/client.ts               # ApiError class · typed fetch · Bearer injection
│       ├── components/
│       │   ├── layout/AppShell.tsx     # sidebar nav · dark mode toggle · <Outlet/>
│       │   └── ui/
│       │       ├── Button.tsx          # variant: primary / secondary / danger / ghost
│       │       └── Input.tsx           # label + error state
│       ├── lib/types.ts                # User · Debt · DebtType · DebtStatus · Violation
│       │                               # NegotiationSession · NegotiationGoal · SessionStatus
│       │                               # PaymentPlanItem · ContactLog · DebtDocument · DocumentType
│       │                               # Deadline · DeadlineType · AIThread · ChatMessage · DebtAnalysis
│       ├── pages/
│       │   ├── Login.tsx               # email + password · MFA redirect on MFA_REQUIRED
│       │   ├── dashboard/Dashboard.tsx # 4 stat cards · debt cards with SVG gauge · deadline panel
│       │   ├── debt/DebtDetail.tsx     # tabs: Overview · Negotiate · Documents · Timeline · Deadlines · Rights
│       │   ├── negotiation/NegotiationWizard.tsx  # 5 steps · Socket.IO call companion
│       │   ├── onboarding/
│       │   │   ├── Welcome.tsx         # particle canvas · animated gradient · 800 requestAnimationFrame
│       │   │   ├── StateSelection.tsx  # 50-state grid → SOL info card
│       │   │   ├── DebtEntry.tsx       # manual + OCR/paste modes
│       │   │   └── CreateAccount.tsx   # step 4 · Rosenthal/legal disclaimer
│       │   └── rights/RightsHub.tsx    # 6 sections · SOL table · CFPB / NACA links
│       ├── stores/
│       │   ├── authStore.ts            # Zustand + persist('debtwise-auth') · login · register
│       │   │                           # logout · refreshAuth · updateUser · setAuth
│       │   └── themeStore.ts           # dark/light · localStorage 'debtwise-theme'
│       └── styles/globals.css          # --color-bg · --color-glass · --color-accent
│                                       # .glass · .glass-card · .gradient-bg · .gradient-text · .shimmer
│
└── server/                             # debtwise-server v1.0.0 · node >=18
    ├── tsconfig.json
    └── src/
        ├── index.ts                    # main() → initDb → migrate → seed → express → Socket.IO
        │                               # helmet(csp:false) · cors · json(10mb) · urlencoded
        │                               # static(client/dist) · SPA fallback · SIGTERM/SIGINT
        ├── ai/
        │   └── debtAnalysis.ts         # SOL_TABLE · STATE_LAWS · runDebtAnalysis (800ms)
        │                               # generateDocumentContent (7 templates) · getChatResponse (500ms)
        ├── config/
        │   ├── env.ts                  # PORT=3001 · DATABASE_URL=./debtwise.db · JWT_SECRET
        │   │                           # JWT_EXPIRES_IN=24h · JWT_REFRESH_EXPIRES_IN=7d
        │   │                           # CORS_ORIGIN=http://localhost:5173 · PLAID · STRIPE · TWILIO · SENDGRID
        │   ├── index.ts                # re-exports: ENV · logger · db · initDb · closeDb
        │   └── logger.ts               # Pino · redacts: req.headers.authorization · body.password · body.token
        ├── db/
        │   ├── connection.ts           # JSON file DB · insert · select · selectOne · update · delete · count
        │   │                           # fs.writeFileSync on every write · parsed to memory on load
        │   ├── migrate.ts              # db.table.create × 8: users · debts · negotiation_sessions
        │   │                           # documents · deadlines · ai_threads · plaid_connections · subscriptions
        │   └── seed.ts                 # demo@debtwise.ai / password123 (bcrypt cost 10 in seed only)
        │                               # Alex Rivera · CA · pro · onboarding_complete: 1
        │                               # Capital One $4,785.43 · Sutter Health $5,400.00
        │                               # 2 deadlines · 1 AI thread with full conversation
        ├── lib/otplib.ts               # authenticator.generateSecret · keyuri · verify
        ├── middleware/
        │   ├── auth.ts                 # authenticate() · optionalAuth() · requirePlan(...plans)
        │   │                           # AuthPayload: { userId, email, plan }
        │   └── validate.ts             # validate(ZodSchema) · asyncHandler · errorHandler
        └── routes/
            ├── auth.ts                 # register(registerSchema) · login(loginSchema) · refresh
            │                           # mfa/setup · mfa/verify · GET me · PUT me
            ├── debts.ts                # createDebtSchema · updateDebtSchema(partial) · CRUD
            │                           # POST /:id/analyze → runDebtAnalysis() · /upload-notice
            ├── negotiations.ts         # sessions CRUD · POST /:sessionId/contact
            ├── documents.ts            # POST (7 types) · PUT (sentAt/sentVia) · GET (md download)
            ├── ai.ts                   # POST /chat → getChatResponse · GET /threads/:debtId
            ├── deadlines.ts            # GET / (by urgency) · PUT /:id/resolve
            └── integrations.ts         # Plaid: link-token · exchange · income-analysis(pro+) · disconnect
                                        # Stripe: create-checkout · webhook · GET /subscription
                                        # POST /alerts/preferences
```

---

## API

### Auth

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ email, password, fullName, stateOfResidence, timezone }` | `201 { user, token, refreshToken }` |
| POST | `/api/auth/login` | — | `{ email, password }` | `{ user, token, refreshToken }` or `{ mfaRequired: true, tempToken }` |
| POST | `/api/auth/refresh` | — | `{ refreshToken }` | `{ token, refreshToken }` |
| POST | `/api/auth/mfa/setup` | ✓ | — | `{ secret, otpauth }` |
| POST | `/api/auth/mfa/verify` | ✓ | `{ code }` | `{ message }` |
| GET | `/api/auth/me` | ✓ | — | `User` |
| PUT | `/api/auth/me` | ✓ | partial User fields | `{ user }` |

### Debts

| Method | Path | Notes |
|---|---|---|
| GET | `/api/debts` | Returns all non-deleted · enriched with `sessionCount`, `activeDeadlines` |
| GET | `/api/debts/:id` | Full record + sessions + documents + deadlines + ai_threads |
| POST | `/api/debts` | `createDebtSchema` — 9 `debtType` values |
| PUT | `/api/debts/:id` | `updateDebtSchema` — all fields optional |
| DELETE | `/api/debts/:id` | Soft delete — sets `status: 'deleted'` |
| POST | `/api/debts/:id/analyze` | Calls `runDebtAnalysis()` · updates debt record · returns `{ analysis }` |
| POST | `/api/debts/upload-notice` | OCR/paste mode · returns `{ extracted }` |

### Negotiations

```
GET  /api/debts/:debtId/sessions
POST /api/debts/:debtId/sessions                   body: { goal: NegotiationGoal }
PUT  /api/debts/:debtId/sessions/:sessionId        body: { status?, finalSettlementAmount? }
POST /api/debts/:debtId/sessions/:sessionId/contact body: { date, contactPerson?, notes, outcome? }
```

### Documents

```
GET  /api/debts/:debtId/documents
POST /api/debts/:debtId/documents   body: { type: DocumentType }  → generates + stores
PUT  /api/documents/:id             body: { sentAt, sentVia }     → marks as sent
GET  /api/documents/:id/pdf         → Content-Disposition: attachment; filename=document.md
```

### AI + WebSocket

```
POST /api/ai/chat              body: { content, debtId? }  → { message: ChatMessage, threadId }
GET  /api/ai/threads/:debtId   → { threads: AIThread[] }

WebSocket events:
  Client → call:join        { userId, debtId }
  Server → call:ready       { message: string }
  Client → call:transcript  { text: string }
  Server → call:suggestion  { suggested: string, reason: string }
```

### Integrations

```
POST   /api/plaid/link-token        [pro+]  → { linkToken, expiration }
POST   /api/plaid/exchange-token    [pro+]  body: { publicToken } → { status, connectionId }
GET    /api/plaid/income-analysis   [pro+]  → { monthlyIncome, discretionaryIncome, recommendedMaxPayment }
DELETE /api/plaid/disconnect        [pro+]
POST   /api/stripe/create-checkout  body: { plan: 'pro'|'premium' } → { url, checkoutSessionId, amount }
POST   /api/stripe/webhook          Stripe-Signature header required
GET    /api/subscription            → { plan, status, currentPeriodEnd }
POST   /api/alerts/preferences      body: { smsEnabled, emailEnabled, phoneNumber }
GET    /api/health                  → { status: 'ok', timestamp, version: '1.0.0' }
```

---

## Tech Stack — Exact Versions

### Client (`client/package.json`)

| Package | Version |
|---|---|
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| react-router-dom | ^6.24.0 |
| react-hook-form | ^7.52.0 |
| @hookform/resolvers | ^3.9.0 |
| zod | ^3.23.8 |
| zustand | ^4.5.4 |
| @tanstack/react-query | ^5.48.0 |
| framer-motion | ^11.2.10 |
| socket.io-client | ^4.7.5 |
| lucide-react | ^0.379.0 |
| clsx | ^2.1.1 |
| date-fns | ^3.6.0 |
| typescript (dev) | ^5.5.0 |
| tailwindcss (dev) | ^3.4.4 |
| vite (dev) | ^5.3.1 |

### Server (`server/package.json`)

| Package | Version |
|---|---|
| express | ^4.21.0 |
| bcryptjs | ^2.4.3 |
| cors | ^2.8.5 |
| dotenv | ^16.4.5 |
| express-rate-limit | ^7.3.1 |
| helmet | ^7.1.0 |
| jsonwebtoken | ^9.0.2 |
| node-cron | ^3.0.3 |
| pino | ^9.2.0 |
| socket.io | ^4.7.5 |
| uuid | ^10.0.0 |
| zod | ^3.23.8 |
| typescript (dev) | ^5.4.5 |
| @swc/core (dev) | ^1.15.40 |
| ts-node (dev) | ^10.9.2 |
| vitest (dev) | ^1.6.0 |
| pino-pretty (dev) | ^11.2.1 |

---

## Getting Started

```bash
# Clone
git clone https://github.com/sat1828/DebtWise.git
cd DebtWise

# Install all workspace deps (client + server + root)
npm install

# Create server environment file
cat > server/.env << EOF
PORT=3001
NODE_ENV=development
DATABASE_URL=./debtwise.db
JWT_SECRET=change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
EOF

# Run (client :5173 + server :3001, concurrently)
npm run dev
```

Open `http://localhost:5173` and sign in with the seeded demo account:

```
Email:    demo@debtwise.ai
Password: password123
```

Two fully-analysed debts, two active deadlines, and one AI thread are pre-loaded.

```bash
npm run build          # builds both workspaces (client → client/dist, server → server/dist)
npm start              # production server — serves built client as static from client/dist
npm run dev:server     # server only on :3001
npm run dev:client     # client only on :5173
npm run test -w server # vitest
npm run db:seed        # ts-node --swc src/db/seed.ts (re-seeds if DB exists)
```

---

## Environment Variables

| Variable | Default in `env.ts` | Production required |
|---|---|---|
| `PORT` | `3001` | No |
| `NODE_ENV` | `development` | No |
| `DATABASE_URL` | `./debtwise.db` | No |
| `JWT_SECRET` | `debtwise-dev-secret-change-in-production-32chars` | **Yes** |
| `JWT_EXPIRES_IN` | `24h` | No |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | No |
| `CORS_ORIGIN` | `http://localhost:5173` | **Yes** |
| `ANTHROPIC_API_KEY` | `""` | Optional |
| `OPENAI_API_KEY` | `""` | Optional |
| `PLAID_CLIENT_ID` | `""` | Pro/Premium income feature |
| `PLAID_SECRET` | `""` | Pro/Premium income feature |
| `PLAID_ENV` | `sandbox` | No |
| `STRIPE_SECRET_KEY` | `""` | Payments |
| `STRIPE_WEBHOOK_SECRET` | `""` | Stripe webhooks |
| `TWILIO_ACCOUNT_SID` | `""` | SMS alerts |
| `TWILIO_AUTH_TOKEN` | `""` | SMS alerts |
| `SENDGRID_API_KEY` | `""` | Email alerts |

---

## Security

| Layer | Detail |
|---|---|
| Passwords | `bcrypt.hash(password, 12)` in auth routes · seed uses cost 10 |
| Access tokens | JWT · 24h · `{ userId, email, plan }` payload |
| Refresh tokens | JWT · 7d · `{ userId, type: 'refresh' }` — separate claim type |
| MFA | TOTP · `otplib.authenticator` · `generateSecret()` + `keyuri()` → any authenticator app |
| Headers | `helmet({ contentSecurityPolicy: false })` — CSP disabled for SPA |
| CORS | `cors({ origin: ENV.CORS_ORIGIN, credentials: true })` |
| Request validation | `validate(ZodSchema)` middleware runs before every route handler |
| Rate limiting | `express-rate-limit` ^7.3.1 on all routes |
| Plan enforcement | `requirePlan('pro', 'premium')` at route level — not just frontend gating |
| Log redaction | Pino redacts `req.headers.authorization`, `req.headers.cookie`, `body.password`, `body.token` |
| Storage | `debtwise_token` + `debtwise_refresh` in `localStorage` — cleared on `logout()` |

---

## Subscription Plans

`requirePlan()` middleware enforced server-side:

| Feature | Free | Pro ($9.99/mo) | Premium ($24.99/mo) |
|---|---|---|---|
| All 9 debt types | ✓ | ✓ | ✓ |
| AI analysis | ✓ | ✓ | ✓ |
| All 7 document templates | ✓ | ✓ | ✓ |
| All 6 negotiation goals | ✓ | ✓ | ✓ |
| Rights Hub (6 sections) | ✓ | ✓ | ✓ |
| Live Call Companion | ✓ | ✓ | ✓ |
| All 5 deadline types | ✓ | ✓ | ✓ |
| Plaid income analysis | — | ✓ | ✓ |
| SMS + email alerts | — | ✓ | ✓ |
| Priority support | — | — | ✓ |

---

## Legal Disclaimer

DebtWise provides legal information and document templates based on publicly available consumer protection law. It is not a law firm. No attorney-client relationship is created by using this service.

The application specifically directs users to consult a licensed attorney in these cases: a lawsuit or summons has been served, a judgment has been entered, wage garnishment has started, the debt exceeds $25,000, or the collector is represented by legal counsel. The Rights Hub references NACA (naca.net) and state bar referral services by name.

Every generated document ends with: *`TEMPLATE — Verify all facts before sending. DebtWise is not your attorney.`*
Every Call Companion session includes: *`Coaching is informational only. You are responsible for everything you say on this call.`*

---

<div align="center">

Built end-to-end in TypeScript · React 18 · Express 4 · Socket.IO 4

*Know your rights. Negotiate smarter. Settle for less.*

</div>
