# Ledgerly — Technical Research: Missing Features

**Date:** 2026-07-26  
**Researcher:** Paige (Tech Writer)  
**Context:** PREMIUM_AUDIT.md identified 10 missing premium features. This document researches the best technical approaches for each.

---

## Current Stack Context

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.10 (Turbopack) |
| Runtime | React 19.2.4 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + OTP) |
| ORM | Supabase JS client (no Prisma) |
| Styling | Tailwind CSS v4 |
| State | TanStack React Query v5 |
| Testing | Vitest |
| Deploy | Vercel |
| Existing PDF | jsPDF + jspdf-autotable (already installed) |
| Existing CSV | Manual string builder (`csv-export.ts`) |
| Existing Cache | In-memory `Map` (`cache.ts`) — **non-functional in serverless** |
| Existing Rate Limit | In-memory `Map` (`rate-limit.ts`) — **non-functional in serverless** |

---

## 1. Receipt OCR

### Recommendation: **Google Document AI** (primary) with **Tesseract.js** (client-side fallback)

### Why Not the Others

| Option | Verdict | Reason |
|--------|---------|--------|
| **AWS Textract** | Runner-up | Best structured extraction (93% field accuracy), but requires AWS account + IAM + S3 staging. Heavier integration overhead for a Supabase/Vercel stack. $0.01/page. |
| **Google Document AI** | **Winner** | 92% field accuracy, 1,000 free pages/month (ongoing), best photo-of-receipt handling, natural fit with existing Frankfurter API pattern. $0.0015/page after free tier. |
| **Tesseract.js** | Fallback | Free, runs in browser via WebAssembly. 75% field accuracy with custom parsing. Good for offline/preview, not production receipt scanning. |
| **Mindee** | Skip | Fastest integration (single REST call), but 3–5% lower accuracy and $29+/month. |

### Integration Architecture

```
User uploads receipt photo
        │
        ▼
┌─────────────────────┐
│  Client: compress    │  Resize to max 1024px, convert to JPEG
│  + preview via       │  (reduce upload size, faster OCR)
│  Tesseract.js        │  Optional: instant local preview
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  API Route:          │  POST /api/expenses/ocr
│  /api/expenses/ocr   │  Receives image, uploads to Supabase Storage
│                      │  Calls Google Document AI
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Supabase Storage    │  Bucket: receipt-images
│  Store raw receipt   │  RLS: user can only read own receipts
└─────────────────────┘
```

### Code Pattern

```typescript
// src/app/api/expenses/ocr/route.ts
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { createClient } from '@/shared/lib/supabase/server'

const client = new DocumentProcessorServiceClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('receipt') as File
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  // Upload to Supabase Storage
  const filePath = `${user.id}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('receipt-images')
    .upload(filePath, file)

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  // Call Google Document AI
  const buffer = Buffer.from(await file.arrayBuffer())
  const [result] = await client.processDocument({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us/processors/${process.env.GOOGLE_DOC_AI_PROCESSOR_ID}`,
    rawDocument: { content: buffer.toString('base64'), mimeType: file.type },
  })

  const { document } = result
  // Extract receipt fields from entities
  const extractField = (type: string) =>
    document?.entities?.find(e => e.type === type)?.mentionText || ''

  return Response.json({
    vendor: extractField('vendor_name'),
    total: extractField('total'),
    tax: extractField('tax'),
    date: extractField('receipt_date'),
    line_items: document?.entities
      ?.filter(e => e.type === 'line_item')
      .map(e => ({ description: e.mentionText, amount: e.confidence })),
    raw_text: document?.text,
    storage_path: filePath,
  })
}
```

### Supabase Storage Setup

```sql
-- Migration for receipt storage
CREATE BUCKET receipt-images;

-- RLS: users can only access their own receipts
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipt-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipt-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Cost Estimate

| Volume | Monthly Cost |
|--------|-------------|
| 500 receipts | $0 (free tier) |
| 5,000 receipts | ~$6 |
| 50,000 receipts | ~$74 |

### Effort Estimate

- Storage bucket + RLS policies: **2 hours**
- API route + Google Document AI integration: **6–8 hours**
- Client upload UI + preview: **4–6 hours**
- Field mapping + expense pre-fill: **3–4 hours**
- **Total: 15–20 hours**

---

## 2. Bank Sync

### Recommendation: **GoCardless Bank Account Data** (formerly Nordigen)

### Comparison

| Feature | Plaid | GoCardless | Salt Edge |
|---------|-------|------------|-----------|
| Countries | 59 | 54 | 73 |
| Institutions | 9,706 | 2,228 | 1,586 |
| Free tier | No (sales-led) | Was free, now paid | No (sales-led) |
| Entry cost | ~$500–2,000/mo minimum | Custom pricing | Custom pricing |
| DX quality | Excellent | Good | Good |
| Best for | US-centric | EU/UK | CEE/MENA |

### Why GoCardless

1. **Largest free tier historically** — Was the go-to for indie builders (Nordigen era). Even post-consolidation, pricing is more transparent than Plaid.
2. **Strong EU/UK coverage** — Ledgerly uses USD/KES but org clients are likely EU/UK-based.
3. **Simpler API** — Account info (AIS) only, no payment initiation complexity.
4. **Supabase-friendly** — REST API, no SDK dependency.

### Integration Architecture

```
User clicks "Connect Bank"
        │
        ▼
┌─────────────────────┐
│  API Route:          │  GET /api/bank-sync/institutions?country=GB
│  /api/bank-sync/     │  Returns list of available banks
│  institutions        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Redirect to         │  GoCardless hosted bank selection
│  GoCardless          │  User picks bank, authenticates
│  Requisition flow    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Webhook/callback    │  POST /api/bank-sync/callback
│  Store requisition   │  Save access tokens to Supabase
│  + account IDs       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Cron: sync          │  pg_cron daily → Edge Function
│  transactions        │  Fetch new transactions → match to expenses
└─────────────────────┘
```

### Database Schema

```sql
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  requisition_id TEXT NOT NULL UNIQUE,
  institution_id TEXT NOT NULL,
  institution_name TEXT,
  status TEXT DEFAULT 'active',
  access_token_encrypted TEXT, -- encrypt with pgcrypto
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES bank_connections(id),
  external_id TEXT NOT NULL,
  amount NUMERIC(15,2),
  currency TEXT,
  description TEXT,
  date DATE,
  matched_expense_id UUID REFERENCES expenses(id),
  status TEXT DEFAULT 'unmatched', -- unmatched, matched, ignored
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (connection_id, external_id)
);
```

### Cost Estimate

- GoCardless Bank Account Data: **Custom pricing** (historically €0–50/month for low volume)
- If Plaid: **$0.30–1.00/connected account/month** + monthly minimums

### Effort Estimate

- Institution list + redirect flow: **6–8 hours**
- Webhook/callback handling: **4–6 hours**
- Transaction sync cron: **8–10 hours**
- Expense matching algorithm: **6–8 hours**
- UI for bank connections management: **4–6 hours**
- **Total: 28–38 hours**

---

## 3. PDF Export

### Recommendation: **Keep jsPDF** (already installed) + enhance with **@react-pdf/renderer** for premium branded reports

### Current State

The project already has `jspdf` v2.5.2 and `jspdf-autotable` v3.8.4 installed. The existing `pdf-export.ts` works but produces basic output.

### Library Comparison

| Feature | jsPDF (current) | @react-pdf/renderer | Puppeteer |
|---------|-----------------|---------------------|-----------|
| Bundle size | ~300 KB | ~500 KB | ~300 MB (Chrome) |
| Serverless | Yes | Yes | No |
| Layout control | Manual x/y | Flexbox JSX | Full HTML/CSS |
| Selectable text | Yes | Yes | Yes |
| Existing code | Yes | No | N/A |
| Learning curve | Low | Medium | High |

### Decision: Keep jsPDF for Quick Exports

jsPDF is already integrated and working. The cost of migrating to `@react-pdf/renderer` (rewriting all layout code, learning new component system, registering fonts) is not justified for expense list exports. Enhance the existing jsPDF implementation instead.

### Enhancement Plan

```typescript
// Enhanced pdf-export.ts patterns

// 1. Add branded header with logo
import logo from '@/shared/assets/logo.png'

// 2. Multi-currency support (format amounts with currency symbols)
const formatCurrency = (cents: number, currency: string) => {
  const symbols: Record<string, string> = { USD: '$', KES: 'KSh', EUR: '€', GBP: '£' }
  return `${symbols[currency] || currency} ${(cents / 100).toFixed(2)}`
}

// 3. Category breakdown summary table
autoTable(doc, {
  startY: 88,
  head: [['Category', 'Total', '% of Total']],
  body: categoryBreakdown.map(c => [
    c.name,
    formatCurrency(c.total, baseCurrency),
    `${((c.total / grandTotal) * 100).toFixed(1)}%`,
  ]),
})

// 4. Monthly/weekly grouping option
// 5. Organization branding (logo, colors, footer)
```

### When to Use @react-pdf/renderer

Use it later for **premium report templates** (monthly PDF reports, tax summaries) where:
- Complex multi-page layouts are needed
- Charts/graphs embedded in PDF
- RTL or CJK font support required
- Branded pixel-perfect design

### Cost Estimate

- jsPDF enhancements (branded headers, multi-currency, category breakdown): **8–12 hours**
- @react-pdf/renderer for premium reports (if needed later): **20–30 hours**
- **Total: 8–12 hours now, 20–30 hours for premium tier**

---

## 4. CSV Export

### Recommendation: **Keep current approach** + add streaming for large datasets via **Papa Parse**

### Current State

The existing `csv-export.ts` is a simple 46-line string builder. It works for small datasets but:
- No streaming (will OOM on 10K+ rows)
- Manual escaping (fragile)
- No proper CSV standard compliance

### Enhancement Plan

For Ledgerly's expected data volumes (most orgs < 10K expenses/month), the current approach with proper escaping is sufficient. Add Papa Parse only if streaming is needed.

```typescript
// Enhanced csv-export.ts with proper escaping and streaming
import Papa from 'papaparse'

interface ExportExpense {
  date: string
  amount_cents: number
  currency: string
  category_name?: string
  notes?: string
  tax_applicable?: boolean
  tax_amount_cents?: number
}

export function generateCSV(expenses: ExportExpense[], baseCurrency: string): string {
  const headers = [
    'Date', 'Description', 'Amount', 'Currency', 'Category',
    'Tax Applicable', 'Tax Amount', 'Notes',
  ]

  const rows = expenses.map(expense => ({
    Date: format(new Date(expense.date), 'yyyy-MM-dd'),
    Description: expense.notes || '',
    Amount: (expense.amount_cents / 100).toFixed(2),
    Currency: expense.currency,
    Category: expense.category_name || '',
    'Tax Applicable': expense.tax_applicable ? 'Yes' : 'No',
    'Tax Amount': expense.tax_amount_cents
      ? (expense.tax_amount_cents / 100).toFixed(2)
      : '0.00',
    Notes: expense.notes || '',
  }))

  return Papa.unparse({ fields: headers, data: rows })
}

// For large datasets: stream via API route
// src/app/api/expenses/export/route.ts
export async function GET(request: Request) {
  const supabase = await createClient()
  // ... auth check ...

  // Fetch all expenses (no pagination)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, categories(name)')
    .eq('org_id', orgId)
    .eq('is_deleted', false)
    .order('date', { ascending: false })

  const csv = generateCSV(expenses || [], baseCurrency)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="ledgerly-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    },
  })
}
```

### When to Use Streaming (Papa Parse)

If datasets exceed 50K rows, use Papa Parse's streaming:

```typescript
import Papa from 'papaparse'

// Stream from Supabase in batches
async function* fetchExpensesBatch(orgId: string, offset: number, limit: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('org_id', orgId)
    .range(offset, offset + limit - 1)
  yield data || []
}

// Papa Parse streaming in API route
export async function GET(request: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Write header
      controller.enqueue(encoder.encode('Date,Amount,Currency,Category,Notes\n'))

      let offset = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const batch = await fetchExpensesBatch(orgId, offset, batchSize).next()
        if (batch.done || batch.value.length === 0) {
          hasMore = false
        } else {
          const csv = Papa.unparse(batch.value, { header: false })
          controller.enqueue(encoder.encode(csv + '\n'))
          offset += batchSize
        }
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/csv' },
  })
}
```

### Cost Estimate

- Enhanced CSV (proper escaping, multi-currency): **3–4 hours**
- Streaming for large datasets: **4–6 hours**
- **Total: 3–10 hours depending on scale needs**

---

## 5. Stripe Billing

### Recommendation: **Stripe Checkout** + **Webhook Handler** + **Customer Portal**

### Architecture

```
User clicks "Upgrade to Pro"
        │
        ▼
┌─────────────────────┐
│  Server Action:      │  Creates Stripe Checkout Session
│  createCheckout()    │  Mode: 'subscription'
│                      │  metadata: { userId, orgId }
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Stripe Checkout     │  Hosted payment page
│  (hosted)            │  Handles PCI, 3DS, localization
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Webhook Handler     │  POST /api/webhooks/stripe
│  (source of truth)   │  Verifies signature, syncs to DB
│                      │  Events: checkout.session.completed,
│                      │  customer.subscription.updated,
│                      │  invoice.payment_failed, etc.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Supabase DB         │  subscriptions table mirrors Stripe state
│  (access authority)  │  Middleware checks subscription status
└─────────────────────┘
```

### Database Schema

```sql
-- Subscriptions table: mirrors Stripe state
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  org_id UUID REFERENCES organizations(id),
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, trialing, past_due, canceled, inactive
  price_id TEXT NOT NULL,
  plan_key TEXT NOT NULL, -- 'solo', 'pro', 'business'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotency: prevent duplicate webhook processing
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Plan Configuration

```typescript
// src/shared/config/plans.ts
export const PLANS = {
  solo: {
    name: 'Solo',
    priceId: process.env.STRIPE_PRICE_SOLO!,
    features: {
      expenses_per_month: 100,
      receipts: false,
      bank_sync: false,
      export: 'csv',
      reports: 'basic',
    },
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO!,
    features: {
      expenses_per_month: -1, // unlimited
      receipts: true,
      bank_sync: false,
      export: 'csv+pdf',
      reports: 'advanced',
    },
  },
  business: {
    name: 'Business',
    priceId: process.env.STRIPE_PRICE_BUSINESS!,
    features: {
      expenses_per_month: -1,
      receipts: true,
      bank_sync: true,
      export: 'csv+pdf',
      reports: 'advanced',
      approval_workflows: true,
      team_members: 10,
    },
  },
} as const

// Resolve entitlements from subscription (never call Stripe at request time)
export function getEntitlements(subscription: Subscription | null) {
  if (!subscription || subscription.status === 'canceled' || subscription.status === 'inactive') {
    return PLANS.solo.features
  }
  const plan = Object.values(PLANS).find(p => p.priceId === subscription.price_id)
  return plan?.features || PLANS.solo.features
}
```

### Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { createClient } from '@/shared/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: Request) {
  const body = await request.text() // MUST be raw text, not parsed JSON
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = await createClient()

  // Idempotency check
  const { error: insertError } = await supabase
    .from('webhook_events')
    .insert({ stripe_event_id: event.id, type: event.type })

  if (insertError) return new Response('OK', { status: 200 }) // Already processed

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const orgId = session.metadata?.org_id
      const subscriptionId = session.subscription as string

      // Fetch subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      await supabase.from('subscriptions').insert({
        user_id: userId,
        org_id: orgId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        plan_key: resolvePlanKey(subscription.items.data[0].price.id),
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          price_id: subscription.items.data[0].price.id,
          plan_key: resolvePlanKey(subscription.items.data[0].price.id),
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
      // TODO: Send dunning email via Resend
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

### CSP Updates Required

```typescript
// next.config.ts — add to Content-Security-Policy
"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://js.stripe.com",
"frame-src https://js.stripe.com",
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
```

### Cost Estimate

- Stripe: 2.9% + $0.30 per transaction (standard)
- Development:
  - DB schema + migrations: **3–4 hours**
  - Checkout flow: **4–6 hours**
  - Webhook handler: **6–8 hours**
  - Customer Portal: **2–3 hours**
  - Entitlements middleware: **3–4 hours**
  - Billing page UI: **4–6 hours**
  - **Total: 22–31 hours**

---

## 6. Rate Limiting

### Recommendation: **Upstash Redis** with `@upstash/ratelimit`

### Why Not the Others

| Option | Verdict | Reason |
|--------|---------|--------|
| **Vercel KV** | Runner-up | Actually backed by Upstash, but adds Vercel vendor lock-in and slightly higher latency (3–8ms first call vs 2ms). Same underlying tech. |
| **Upstash Redis** | **Winner** | Serverless-native (HTTP API), generous free tier (10K commands/day), works in Edge middleware, no persistent connections. |
| **Supabase Edge Functions** | Skip | Wrong tool — Edge Functions are for compute, not rate limiting. |

### Implementation

```typescript
// src/shared/lib/rate-limit.ts (replace current in-memory version)
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Auth endpoints: 5 requests per minute
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: 'rl:auth',
})

// API endpoints: 60 requests per minute
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'),
  analytics: true,
  prefix: 'rl:api',
})

// General: 100 requests per minute
export const generalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),
  analytics: true,
  prefix: 'rl:general',
})

// Export for middleware use
export function getRateLimiter(pathname: string) {
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/reset-password')) {
    return authRatelimit
  }
  if (pathname.startsWith('/api/')) {
    return apiRatelimit
  }
  return generalRatelimit
}
```

### Middleware Integration

```typescript
// In src/shared/lib/supabase/middleware.ts — add after route classification
import { getRateLimiter } from '@/shared/lib/rate-limit'

// After auth enforcement, before returning supabaseResponse:
const ratelimit = getRateLimiter(pathname)
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

const { success, limit, reset, remaining } = await ratelimit.limit(ip)

if (!success) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      },
    }
  )
}
```

### Cost Estimate

- Upstash free tier: **10,000 commands/day** (~5,000 rate-limited requests with sliding window)
- Pay-as-you-go: **$0.20 per 100K commands**
- At 1M API requests/month: **~$4/month**
- Development: **4–6 hours**

---

## 7. Caching

### Recommendation: **Upstash Redis** (same instance as rate limiting) + **ISR for exchange rates**

### Why Not Vercel KV

Vercel KV is just Upstash with a Vercel wrapper. Use Upstash directly to avoid vendor lock-in and get the same functionality with more control.

### Current Problem

The `cache.ts` in-memory Map is non-functional in serverless:
- Each cold start gets a fresh Map
- Multiple instances don't share state
- Memory is not shared across regions

### Implementation

```typescript
// src/shared/lib/cache.ts (replace current in-memory version)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redis.get<T>(key)
  return value
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds })
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key)
}

// Cache key generators
export const cacheKeys = {
  exchangeRates: (baseCurrency: string) => `rates:${baseCurrency}`,
  userSettings: (userId: string) => `settings:${userId}`,
  userCategories: (userId: string) => `categories:${userId}`,
  expenseSummary: (userId: string, month: string) => `summary:${userId}:${month}`,
} as const

// TTL configurations (seconds)
export const cacheTTL = {
  exchangeRates: 3600,       // 1 hour
  userSettings: 900,         // 15 minutes
  userCategories: 1800,      // 30 minutes
  expenseSummary: 300,       // 5 minutes
} as const

// Wrapper for cached async functions
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  await setCache(key, data, ttlSeconds)
  return data
}
```

### Exchange Rate Caching Strategy

The existing `exchange-rate/service.ts` already caches rates in the DB. Layer Redis on top:

```typescript
// In exchange-rate/service.ts — add Redis caching layer
import { getCache, setCache, cacheKeys, cacheTTL } from '@/shared/lib/cache'

export async function getExchangeRates(baseCurrency: string) {
  // Layer 1: Redis cache (sub-ms reads)
  const cacheKey = cacheKeys.exchangeRates(baseCurrency)
  const cached = await getCache<ExchangeRateResponse>(cacheKey)
  if (cached) return cached

  // Layer 2: DB cache (existing logic)
  const stale = await isRatesStale(baseCurrency)
  if (!stale) {
    const dbRates = await findLatestRates(baseCurrency)
    const rates: Record<string, number> = {}
    dbRates.forEach(rate => { rates[rate.target_currency] = rate.rate })
    const response = { base: baseCurrency, date: ..., rates }
    await setCache(cacheKey, response, cacheTTL.exchangeRates)
    return response
  }

  // Layer 3: Frankfurter API (existing logic)
  const freshRates = await fetchRatesFromAPI(baseCurrency)
  await upsertRates(freshRates)
  await setCache(cacheKey, freshRates, cacheTTL.exchangeRates)
  return freshRates
}
```

### Cost Estimate

- Same Upstash instance as rate limiting: **$0–4/month**
- Development: **3–4 hours** (swap in-memory for Redis)

---

## 8. Approval Workflows

### Recommendation: **Database-driven state machine** with configurable policy table

### Architecture

The key insight from research: store approval thresholds in a database table, not hardcoded. The chain is built at submission time and each step is an individual row for audit trail.

### Database Schema

```sql
-- Configurable approval policies (admin-editable, no code deploy needed)
CREATE TABLE approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  level INTEGER NOT NULL,              -- 1, 2, 3
  min_amount_cents INTEGER NOT NULL DEFAULT 0,
  max_amount_cents INTEGER,            -- NULL = no upper limit
  approver_role TEXT NOT NULL,         -- 'admin', 'manager'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, level)
);

-- One row per approval step per expense (immutable audit trail)
CREATE TABLE expense_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) NOT NULL,
  level INTEGER NOT NULL,
  approver_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  note TEXT,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (expense_id, level)
);

-- Add status to expenses table
ALTER TABLE expenses ADD COLUMN approval_status TEXT DEFAULT 'draft';
-- draft, pending, approved, rejected
```

### State Machine

```
                    ┌──────────┐
                    │  DRAFT   │  User creates expense
                    └────┬─────┘
                         │ submit()
                         ▼
                    ┌──────────┐
                    │  PENDING │  Building approval chain
                    └────┬─────┘
                         │ chain built
                         ▼
              ┌─────────────────────┐
              │ APPROVAL_PENDING_L1 │  Waiting for level 1 approver
              └─────────┬───────────┘
                        │ approve()
                        ▼
              ┌─────────────────────┐
              │ APPROVAL_PENDING_L2 │  (if 2-level policy)
              └─────────┬───────────┘
                        │ approve()
                        ▼
                   ┌─────────┐
                   │APPROVED │  All levels approved
                   └─────────┘

        At any level: reject() → REJECTED (remaining steps cancelled)
```

### Code Pattern

```typescript
// src/entities/expense/approval.ts
import { createClient } from '@/shared/lib/supabase/server'

export async function submitForApproval(expenseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Get expense
  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single()

  // 2. Get applicable approval policies for this org + amount
  const { data: policies } = await supabase
    .from('approval_policies')
    .select('*')
    .eq('org_id', expense.org_id)
    .eq('active', true)
    .lte('min_amount_cents', expense.amount_cents)
    .or(`max_amount_cents.is.null,max_amount_cents.gte.${expense.amount_cents}`)
    .order('level', { ascending: true })

  if (!policies || policies.length === 0) {
    // No approval required — auto-approve
    await supabase
      .from('expenses')
      .update({ approval_status: 'approved' })
      .eq('id', expenseId)
    return { status: 'auto_approved' }
  }

  // 3. Build approval chain (one step per policy level)
  for (const policy of policies) {
    // Find an active user with the required role in this org
    const { data: approver } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', expense.org_id)
      .eq('role', policy.approver_role)
      .limit(1)
      .single()

    if (!approver) {
      throw new Error(`No ${policy.approver_role} found for approval level ${policy.level}`)
    }

    await supabase.from('expense_approval_steps').insert({
      expense_id: expenseId,
      level: policy.level,
      approver_id: approver.user_id,
      status: 'pending',
    })
  }

  // 4. Update expense status
  await supabase
    .from('expenses')
    .update({ approval_status: 'pending' })
    .eq('id', expenseId)

  return { status: 'pending', levels: policies.length }
}

export async function approveStep(stepId: string, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Mark step as approved
  const { data: step } = await supabase
    .from('expense_approval_steps')
    .update({ status: 'approved', note, actioned_at: new Date().toISOString() })
    .eq('id', stepId)
    .eq('approver_id', user!.id)
    .eq('status', 'pending')
    .select('expense_id, level')
    .single()

  if (!step) throw new Error('Step not found or already actioned')

  // Check if there are more pending steps
  const { data: remaining } = await supabase
    .from('expense_approval_steps')
    .select('id')
    .eq('expense_id', step.expense_id)
    .eq('status', 'pending')

  if (!remaining || remaining.length === 0) {
    // All steps approved
    await supabase
      .from('expenses')
      .update({ approval_status: 'approved' })
      .eq('id', step.expense_id)
    return { status: 'fully_approved' }
  }

  return { status: 'partially_approved', remaining: remaining.length }
}

export async function rejectStep(stepId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: step } = await supabase
    .from('expense_approval_steps')
    .update({ status: 'rejected', note: reason, actioned_at: new Date().toISOString() })
    .eq('id', stepId)
    .eq('approver_id', user!.id)
    .select('expense_id')
    .single()

  if (!step) throw new Error('Step not found')

  // Cancel all remaining pending steps
  await supabase
    .from('expense_approval_steps')
    .update({ status: 'rejected', note: 'Cancelled: earlier step rejected' })
    .eq('expense_id', step.expense_id)
    .eq('status', 'pending')

  await supabase
    .from('expenses')
    .update({ approval_status: 'rejected' })
    .eq('id', step.expense_id)

  return { status: 'rejected' }
}
```

### Cost Estimate

- Database schema + RLS: **3–4 hours**
- Approval state machine: **8–10 hours**
- Approval queue UI (manager view): **6–8 hours**
- Notification integration: **3–4 hours**
- **Total: 20–26 hours**

---

## 9. Recurring Expenses

### Recommendation: **Supabase pg_cron + Edge Functions** (database-native scheduler)

### Why Not Vercel Cron

| Option | Verdict | Reason |
|--------|---------|--------|
| **Supabase pg_cron** | **Winner** | Free on all plans, runs inside the database, no external dependency, 1-second minimum interval. |
| **Vercel Cron** | Runner-up | Requires `vercel.json` config, limited to 1-minute intervals, counts against function execution limits. |
| **External cron (Crontap)** | Fallback | Better for retries/alerting, but adds $3+/month and external dependency. |

### Database Schema

```sql
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  org_id UUID REFERENCES organizations(id),
  template JSONB NOT NULL, -- expense data to复制
  frequency TEXT NOT NULL, -- daily, weekly, monthly, yearly
  interval_count INTEGER DEFAULT 1,
  next_due_date DATE NOT NULL,
  last_generated_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recurring_next_due ON recurring_expenses(next_due_date) WHERE active = true;
```

### Implementation

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily check for due recurring expenses
SELECT cron.schedule(
  'generate-recurring-expenses',
  '0 6 * * *',  -- 6 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/generate-recurring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('triggered_by', 'pg_cron'),
    timeout_milliseconds := 30000
  );
  $$
);
```

```typescript
// supabase/functions/generate-recurring/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find all recurring expenses due today or earlier
  const { data: dueExpenses } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('active', true)
    .lte('next_due_date', new Date().toISOString().split('T')[0])

  if (!dueExpenses || dueExpenses.length === 0) {
    return new Response(JSON.stringify({ generated: 0 }))
  }

  let generated = 0

  for (const recurring of dueExpenses) {
    // Create the expense from template
    const { error } = await supabase.from('expenses').insert({
      ...recurring.template,
      user_id: recurring.user_id,
      org_id: recurring.org_id,
      date: new Date().toISOString().split('T')[0],
    })

    if (!error) {
      // Calculate next due date
      const nextDue = calculateNextDue(recurring.next_due_date, recurring.frequency, recurring.interval_count)

      await supabase
        .from('recurring_expenses')
        .update({
          next_due_date: nextDue,
          last_generated_at: new Date().toISOString(),
        })
        .eq('id', recurring.id)

      generated++
    }
  }

  return new Response(JSON.stringify({ generated }))
})

function calculateNextDue(current: string, frequency: string, interval: number): string {
  const date = new Date(current)
  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + interval); break
    case 'weekly': date.setDate(date.getDate() + 7 * interval); break
    case 'monthly': date.setMonth(date.getMonth() + interval); break
    case 'yearly': date.setFullYear(date.getFullYear() + interval); break
  }
  return date.toISOString().split('T')[0]
}
```

### Cost Estimate

- pg_cron: **$0** (free on all Supabase plans)
- Edge Function invocations: **$0** (Supabase free tier: 500K/month)
- Development:
  - DB schema: **2 hours**
  - Edge Function: **4–6 hours**
  - UI for creating recurring templates: **4–6 hours**
  - **Total: 10–14 hours**

---

## 10. Email Notifications

### Recommendation: **Resend** with **React Email** templates

### Why Not SendGrid

| Feature | Resend | SendGrid |
|---------|--------|----------|
| Free tier (2026) | 3,000/month **forever** | 60-day trial, then $19.95/month |
| React Email | Native support | Not supported |
| DX | Modern, clean | Legacy, complex |
| Setup time | ~10 minutes | ~30–45 minutes |
| Vercel integration | One-click | Manual |

SendGrid killed its free tier in May 2025. For a new SaaS app, Resend is the clear winner.

### Integration Architecture

```
Event triggers email (approval needed, payment failed, etc.)
        │
        ▼
┌─────────────────────┐
│  Server Action or    │  Calls email service
│  Webhook Handler     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Resend API          │  Sends email via React Email template
│  resend.emails.send  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  React Email         │  Type-safe templates in src/emails/
│  Templates           │  Tailwind CSS support
└─────────────────────┘
```

### Template Examples

```tsx
// src/emails/welcome.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components'

interface WelcomeEmailProps {
  userName: string
  loginUrl: string
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0a0f1e', color: '#ffffff', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', padding: '40px 20px' }}>
          <Text style={{ fontSize: '24px', color: '#34d399' }}>
            Welcome to Ledgerly, {userName}!
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
            Your expense tracking journey starts now. Click below to get started.
          </Text>
          <Button
            href={loginUrl}
            style={{ backgroundColor: '#34d399', color: '#000', padding: '12px 24px', borderRadius: '8px' }}
          >
            Go to Dashboard
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

// src/emails/approval-needed.tsx
import { Html, Head, Body, Container, Text } from '@react-email/components'

interface ApprovalEmailProps {
  managerName: string
  expenseTitle: string
  amount: string
  submitterName: string
  approveUrl: string
}

export function ApprovalNeededEmail({ managerName, expenseTitle, amount, submitterName, approveUrl }: ApprovalEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0a0f1e', color: '#ffffff', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', padding: '40px 20px' }}>
          <Text style={{ fontSize: '20px' }}>Expense Approval Required</Text>
          <Text>{submitterName} submitted "{expenseTitle}" for {amount}.</Text>
          <Text>Click below to review and approve.</Text>
          <Button href={approveUrl} style={{ backgroundColor: '#34d399', padding: '12px 24px' }}>
            Review Expense
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Sending Code

```typescript
// src/shared/lib/email.ts
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'
import { ApprovalNeededEmail } from '@/emails/approval-needed'
import { render } from '@react-email/render'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  const html = render(react)

  const { error } = await resend.emails.send({
    from: 'Ledgerly <notifications@ledgerly.app>',
    to,
    subject,
    html,
  })

  if (error) {
    console.error('Email send failed:', error)
    throw error
  }
}

// Usage in approval workflow
export async function notifyManagerOfExpense(managerEmail: string, expense: Expense, submitter: User) {
  await sendEmail({
    to: managerEmail,
    subject: `Expense approval needed: ${expense.title}`,
    react: ApprovalNeededEmail({
      managerName: manager.email,
      expenseTitle: expense.title,
      amount: formatCurrency(expense.amount_cents, expense.currency),
      submitterName: submitter.display_name,
      approveUrl: `${process.env.NEXT_PUBLIC_APP_URL}/expenses/${expense.id}/approve`,
    }),
  })
}

// Usage in dunning flow
export async function notifyPaymentFailed(userEmail: string, invoice: Stripe.Invoice) {
  await sendEmail({
    to: userEmail,
    subject: 'Payment failed — action required',
    react: PaymentFailedEmail({
      amount: formatAmount(invoice.amount_due, invoice.currency),
      updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    }),
  })
}
```

### Email Templates to Build

| Template | Trigger | Priority |
|----------|---------|----------|
| Welcome | Signup | P1 |
| Approval needed | Expense submitted | P1 |
| Approved | Expense approved | P1 |
| Rejected | Expense rejected | P1 |
| Payment failed | Stripe invoice failed | P1 (with Stripe) |
| Trial ending | 3 days before trial end | P2 (with Stripe) |
| Weekly digest | Cron: every Monday | P3 |
| Password reset | Supabase handles this | N/A |

### Cost Estimate

- Resend free tier: **$0** (3,000 emails/month)
- Pro tier (if needed): **$20/month** (50,000 emails)
- Development:
  - Resend setup + domain verification: **1 hour**
  - React Email templates (6 core): **8–12 hours**
  - Integration with approval workflow: **3–4 hours**
  - Integration with Stripe dunning: **2–3 hours**
  - **Total: 14–20 hours**

---

## Summary: Priority Order & Total Effort

| # | Feature | Effort | Cost/mo | Dependencies |
|---|---------|--------|---------|-------------|
| 1 | **Rate Limiting** | 4–6h | $0–4 | Upstash Redis |
| 2 | **Caching** | 3–4h | $0–4 | Upstash Redis (same) |
| 3 | **CSV Export Enhancement** | 3–10h | $0 | None |
| 4 | **PDF Export Enhancement** | 8–12h | $0 | None (jsPDF already installed) |
| 5 | **Email Notifications** | 14–20h | $0–20 | Resend |
| 6 | **Recurring Expenses** | 10–14h | $0 | Supabase pg_cron (free) |
| 7 | **Approval Workflows** | 20–26h | $0 | None |
| 8 | **Receipt OCR** | 15–20h | $0–74 | Google Document AI |
| 9 | **Stripe Billing** | 22–31h | Stripe fees | Stripe |
| 10 | **Bank Sync** | 28–38h | $0–50 | GoCardless |

**Total estimated effort: 127–181 hours**  
**Total estimated monthly cost at launch: $0–152** (depends on volume and plan tier)

### Recommended Sprint Order

1. **Sprint 1 (Security):** Rate Limiting + Caching (7–10h) — fixes critical security gaps
2. **Sprint 2 (Exports):** CSV + PDF enhancements (11–22h) — quick wins, high user value
3. **Sprint 3 (Email):** Resend + templates (14–20h) — enables notifications for everything else
4. **Sprint 4 (Automation):** Recurring + Approval (30–40h) — core premium features
5. **Sprint 5 (Premium):** Receipt OCR + Stripe (37–51h) — monetization + wow factor
6. **Sprint 6 (Integration):** Bank Sync (28–38h) — complex, do last

---

*Research compiled from: official documentation, production comparisons, and 2026 pricing data.*
