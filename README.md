# RIA Transfer — Money Transfer Quote App

A full-stack application for getting quotes on international money transfers, saving quotes, submitting transfer requests, and viewing history.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| API | tRPC (end-to-end type safety) |
| Database | Supabase PostgreSQL |
| ORM | Prisma |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + shadcn/ui |
| Exchange Rates | ExchangeRate-API (exchangerate-api.com) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [ExchangeRate-API](https://www.exchangerate-api.com/) key (free tier: 1500 req/month)

### Setup

1. **Clone and install**

```bash
git clone <repo-url>
cd ria-exercise
npm install
```

2. **Configure environment variables**

```bash
cp .env.example .env
```

Fill in your `.env`:
- `DATABASE_URL` — Supabase PostgreSQL connection string. To find it: go to your Supabase project, click **Connect**, select the **ORMs** tab, choose **Prisma** as the tool, and copy the `DIRECT_URL` value (labeled "Direct connection to the database. Used for migrations").
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon/public key
- `EXCHANGE_RATE_API_KEY` — Your ExchangeRate-API key

3. **Run database migrations**

```bash
npx prisma migrate dev --name init
```

4. **Start the dev server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Data Model

```
User ──< Quote ──? Transfer
           │
   ExchangeRate (cache table)
```

See [`prisma/schema.prisma`](prisma/schema.prisma) for full details.

### Schema choices

- **User.id matches Supabase auth.users.id** — Users are synced to the application database on first authenticated request via tRPC middleware (upsert pattern). This avoids a separate mapping table and keeps the user model minimal.

- **Quote stores a rate snapshot** — `Quote.exchangeRate` is a copied value, not a foreign key to ExchangeRate. The rate in the ExchangeRate table can change, but we want to keep the rate we promised to the user when creating the quote.

- **Quote.expiresAt = creation + 15 minutes** — Expired quotes cannot become transfers. This protects against stale exchange rates.

- **Transfer.quoteId is @unique** — Enforces one transfer per quote at the database level, preventing double-submission even under concurrent requests.

- **Currency as VARCHAR(3)** — ISO 4217 codes stored inline alongside amounts. No separate currency table needed — the set of supported currencies is small and static.

- **Amount + currency as adjacent fields** — Another way would be to have a Money table, but it adds complexity without much benefit.

- **Quote persists all computed values** — `sourceAmount`, `targetAmount`, `exchangeRate`, `feePercentage`, and `feeAmount` are all stored. The `targetAmount` could be derived from the other fields, but storing it avoids floating point precision and rounding differences between calculation and display — what is saved is what the user sees and what is used to make the transfer.

- **ExchangeRate table is an append-only log** — Every fetched rate is stored as a new row, providing full traceability of historical rates. To avoid unnecessary API calls, the most recent row for a currency pair is reused if it was fetched within the last 60 minutes. Each row also stores the full API response (`rawResponse` JSON column) for auditability. If the response fails to serialize, the error is logged and `rawResponse` is stored as `null` so rate caching is not disrupted.

### What API data is persisted and why

The app consumes a single external API: the [ExchangeRate-API](https://www.exchangerate-api.com/) pair endpoint (`/v6/{key}/pair/{base}/{target}`). The response includes fields like `conversion_rate`, `time_last_update_utc`, `time_next_update_utc`, `base_code`, and `target_code`.

From that response, only two things are persisted:

- **`conversion_rate` → `ExchangeRate.rate`** — The exchange rate for the currency pair. This is the only field needed for the business logic (calculating quotes). It is then copied into `Quote.exchangeRate` as a snapshot so the quote is independent of future rate changes.
- **Full JSON response → `ExchangeRate.rawResponse`** — The entire API response is stored as a JSON column for auditability and debugging. If serialization fails, it is stored as `null` to avoid disrupting the caching flow.

Other fields from the API (`time_last_update_utc`, `base_code`, etc.) are not modeled as individual columns because they are not needed for any application logic. They remain accessible through `rawResponse` if needed for analysis.

### Fee logic

Simple percentage-based: **1.5% of source amount**.

```
feeAmount    = sourceAmount × 0.015
targetAmount = (sourceAmount − feeAmount) × exchangeRate
```

## Architecture

### Stack choices

- **Next.js + tRPC** — Mainly to use tRPC, which adds end-to-end type safety and accelerates development with Claude Code, avoiding boilerplate and type errors right away.
- **Supabase Auth** — I worked with it before and it works well with Claude Code.
- **Supabase PostgreSQL + Prisma** — Supabase because I already used it for authentication. Prisma for ORM because it has migrations managed in code and a database-agnostic abstraction layer; maybe not necessary for a small project like this, but I'm comfortable with it.

### Auth Flow

1. Supabase Auth handles signup/login/logout (client-side SDK)
2. Next.js middleware protects `/dashboard/*` routes and refreshes sessions
3. tRPC context extracts the session via Supabase server client
4. Protected procedures upsert the user in Prisma on first access
5. All database queries are scoped to `ctx.userId`, so they cannot access another user's quotes or transfers.

### Exchange Rate Fetching

```
User requests quote (USD → EUR)
  → Check ExchangeRate table for (USD, EUR) where fetchedAt > now - 60min
  → If fresh → reuse latest rate
  → If stale/missing → call ExchangeRate-API → insert new row → use new rate
  → Create Quote with rate snapshot + expiresAt = now + 15min
```

### tRPC Routers

- **quote.calculate** — Fetches/caches rate, computes fee + target amount, returns preview (not persisted)
- **quote.save** — Re-validates rate, creates Quote in DB with status "saved"
- **quote.list** — Returns user's quotes, marks expired ones
- **transfer.create** — Validates quote (owned, saved, not expired, no existing transfer), creates Transfer, updates Quote to "accepted"
- **transfer.list** — Returns user's transfers with quote details

## Tradeoffs

- **Tests** — I nearly always make tests when working with AI, specially when developing things with money, but I preferred to focus on reviewing code and documenting decisions.
- **Error handling** — I didn't test all the loading and error states in the frontend. The transfer creation button in the quote list, for example, doesn't display errors to the user if the mutation fails.
- **Status fields are strings, not enums** — Quote and Transfer statuses are stored as plain strings with no database-level constraint. Prisma enums would be safer.
- **Quote expiration is application-only** — The `status` field in the DB stays "saved" even after a quote expires; expiration is computed at read time. The transfer router does check `expiresAt` before accepting, so it's not exploitable, but the DB doesn't reflect the real state.

## What I'd improve with more time

- **ExchangeRate API reliability** — Fetching blocks the request. I would add a timeout on the fetch call, a cronjob that fetches rates periodically, and synchronization best practices like rate-limiting, circuit breaker and retries.
- **Code organization** — Move `exchange-api.ts` into a *services* directory (business logic) and extract the HTTP call into a *clients* directory (decoupled from business logic).
- **Currency selector UX** — The dropdown should be searchable and filterable by country.
- **Test suite** — Unit tests for fee calculation and exchange rate caching logic, integration tests for the quote-to-transfer flow.

## Project Structure

```
app/                          # Next.js App Router pages
  login/, signup/             # Auth pages
  dashboard/                  # Protected dashboard
    quote/new/                # New quote form
  api/trpc/[trpc]/            # tRPC HTTP handler
server/                       # tRPC server code
  trpc.ts                     # Context, auth middleware
  router.ts                   # Merged app router
  routers/                    # Domain routers (quote, transfer)
lib/                          # Shared utilities
  supabase/                   # Supabase client (browser + server)
  prisma.ts                   # Prisma client singleton
  exchange-api.ts             # Exchange rate fetching + caching
  constants.ts                # App configuration
  trpc.ts                     # tRPC React client
components/                   # React components
  ui/                         # shadcn/ui primitives
  quote-form.tsx              # Quote input form
  quote-result.tsx            # Quote preview with save
  quote-list.tsx              # Saved quotes table
  transfer-list.tsx           # Transfer history table
prisma/
  schema.prisma               # Database schema
```
