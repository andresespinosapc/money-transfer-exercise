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
- `DATABASE_URL` — Supabase PostgreSQL connection string (found in Supabase → Settings → Database → Connection string → URI)
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

### Key Decisions

- **Quote.exchangeRate is a snapshot** — The rate is frozen at quote creation time (not a foreign key to ExchangeRate). This matches how real transfer services (Wise, Remitly) work: the rate you see is the rate you get.

- **ExchangeRate table is an append-only log** — Every fetched rate is stored as a new row, providing full traceability of historical rates. To avoid unnecessary API calls, the most recent row for a currency pair is reused if it was fetched within the last 60 minutes. Each row also stores the full API response (`rawResponse` JSON column) for auditability. If the response fails to serialize, the error is logged and `rawResponse` is stored as `null` so rate caching is not disrupted.

- **Quote.expiresAt = creation + 15 minutes** — Expired quotes cannot become transfers. This protects against stale exchange rates.

- **Transfer.quoteId is @unique** — Enforces one transfer per quote at the database level, preventing double-submission even under concurrent requests.

- **User.id matches Supabase auth.users.id** — Users are synced to the application database on first authenticated request via tRPC middleware (upsert pattern).

- **Currency as VARCHAR(3)** — ISO 4217 codes stored inline alongside amounts. No separate currency table needed — the set of supported currencies is small and static.

- **Amount + currency as adjacent fields** — Standard fintech pattern. Each monetary amount is stored with its currency context.

## Fee Logic

Simple percentage-based: **1.5% of source amount**.

```
feeAmount    = sourceAmount × 0.015
targetAmount = (sourceAmount − feeAmount) × exchangeRate
```

Both `feePercentage` and `feeAmount` are stored on each quote for auditability.

## Architecture

### Auth Flow

1. Supabase Auth handles signup/login/logout (client-side SDK)
2. Next.js middleware protects `/dashboard/*` routes and refreshes sessions
3. tRPC context extracts the session via Supabase server client
4. Protected procedures upsert the user in Prisma on first access
5. All database queries are scoped to `ctx.userId`

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

## Tradeoffs & Future Improvements

- **exchange-api.ts** - I would prefer to move this function into a *services* directory because it's more coupled to the business logic. The part that sends the request to the API, which is decoupled from the business logic, could be moved to a *clients* directory.
- **Search by country** - In the frontend, the currency selector should be searchable and it should be possible to filter by country.
- **Tests** - I nearly always make tests when working with AI, specially when developing things with money, but I prefered to focus on reviewing code and documenting decisions.
- **ExchangeRate API reliability** - There's a lot of improvements to make here: Fetching should be async so it doesn't block the API, I would make a cronjob that fetches it periodically. Also, I could include synchronization best practices, like rate-limiting, circuit breaker and retries.
- **Error handling** - I didn't test all the loading and error states in the frontend.

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
