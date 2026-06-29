# KPI SMS Dashboard (KPIFlow)

A SaaS platform that delivers AI-powered, industry-specific KPI summaries to executives via SMS every Friday. Companies configure KPIs, assign data entry to team members, and executives receive automated weekly reports.

## Run & Operate

```bash
npm run dev          # Start dev server (Express + Vite on port 5000)
npx tsc --noEmit     # Type check
```

**Required env vars:** `DATABASE_URL`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `KPIFLOWKEY` (OpenAI key), `SENDBLUE_API_KEY_ID`, `SENDBLUE_API_SECRET_KEY` (optional — SMS disabled if missing)

## Stack

- **Frontend:** React 18 + TypeScript, Wouter routing, TanStack Query v5, shadcn/ui + Radix UI, Tailwind CSS
- **Backend:** Express.js + TypeScript, Drizzle ORM, node-cron
- **Database:** PostgreSQL (Neon)
- **Auth:** Auth0 (OpenID Connect via `server/auth0.ts`)
- **Build:** Vite (frontend) + ESBuild (backend)

## Where things live

```
client/src/
  pages/          # landing, dashboard, kpi-config, sms-recipients, team-management, billing, setup-*
  components/     # sidebar, header, kpi-card, sms-preview, activity-feed, trends-chart, add-kpi-modal
  components/ui/  # shadcn primitives (only those actually used)
  hooks/          # useAuth, use-toast, use-mobile
  lib/            # queryClient, authUtils, design-system, utils
server/
  auth0.ts        # Auth0 OIDC setup + isAuthenticated middleware
  routes.ts       # All API endpoints (~1000 lines)
  storage.ts      # Database access layer (IStorage interface)
  services/       # openai.ts, twilio.ts, stripe.ts, scheduler.ts
shared/
  schema.ts       # Drizzle schema + Zod insert schemas + types
  industryConfig.ts # Industry field rules for setup wizard
```

## Architecture decisions

- **Auth:** Auth0 (not Replit auth) — `server/auth0.ts` is the only auth file; `replitAuth.ts` was removed
- **Stripe flow:** Frontend calls `/api/create-subscription` → gets `clientSecret` → passes to `Elements` → `PaymentElement` + `confirmPayment` with `redirect: "if_required"`
- **Stripe env vars:** Backend uses `STRIPE_SECRET_KEY`; frontend uses `VITE_STRIPE_PUBLIC_KEY`
- **OpenAI key:** Stored as `KPIFLOWKEY` (custom name — see `server/services/openai.ts`)
- **SMS:** Sendblue REST API (`server/services/sendblue.ts`) — iMessage blue bubbles for iPhone, RCS for Android, SMS fallback. Needs `SENDBLUE_API_KEY_ID` + `SENDBLUE_API_SECRET_KEY`
- **Routing:** Unauthenticated → Landing (all routes); `!companyId` → Setup flow; authenticated → Dashboard + full app

## Product

- Landing page with signup CTA and pricing tiers ($39 / $79 / $149/mo)
- AI Setup Agent (conversational chat) guides new users through onboarding
- KPI configuration with AI-generated industry-specific suggestions
- SMS recipient management with weekly Friday delivery schedule
- Team collaboration — assign KPI data entry to team members
- Billing page with Stripe subscription management (Starter / Professional / Business)
- Dashboard with KPI cards, trend charts, SMS preview, and activity feed

## User preferences

- Simple, everyday language
- Dark futuristic AI aesthetic with glass morphism effects

## Gotchas

- Stripe webhook route is registered in `server/index.ts` (before `express.json()`) — do not move it to `routes.ts`
- `ui/scroll-area.tsx` is used by `guided-setup.tsx` — do not delete it
- `ui/sidebar.tsx` (shadcn complex component) is separate from `components/sidebar.tsx` (app sidebar)
- Industry field deduplication in `getVisibleFieldsForIndustry()` prevents duplicate form fields
- OpenAI falls back to default KPIs if API key is missing — no hard crash
