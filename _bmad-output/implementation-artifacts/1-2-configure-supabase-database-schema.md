# Story 1.2: Configure Supabase Database Schema

Status: review

## Story

As a developer,
I want to create the PostgreSQL schema with all tables, indexes, constraints, and RLS policies,
so that the data layer is ready for feature implementation.

## Acceptance Criteria

1. Tables created: profiles, categories, expenses, settings, exchange_rates
2. UUID primary keys on all tables
3. user_id foreign key to auth.users on all tables
4. RLS policies: user_id = auth.uid() on all tables
5. Indexes on: user_id, created_at, category_id, date
6. Categories seeded with defaults (Meals & Entertainment, Transport, Housing, Utilities, Shopping, Health, Education, Other)

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration file (AC: #1-5)
  - [x] Create `supabase/migrations/001_initial_schema.sql`
  - [x] Define profiles table (id, user_id, display_name, avatar_url, created_at, updated_at)
  - [x] Define categories table (id, user_id, name, icon, color, created_at)
  - [x] Define expenses table (id, user_id, amount_cents, currency, category_id, date, notes, tax_applicable, is_deleted, deleted_at, created_at, updated_at)
  - [x] Define settings table (id, user_id, base_currency, vat_rate, theme, created_at, updated_at)
  - [x] Define exchange_rates table (id, base_currency, target_currency, rate, fetched_at, expires_at)
  - [x] Add UUID primary keys using gen_random_uuid()
  - [x] Add foreign key constraints to auth.users
  - [x] Add indexes for performance
- [x] Task 2: Enable RLS and create policies (AC: #4)
  - [x] Enable RLS on all tables
  - [x] Create SELECT policies for user_id = auth.uid()
  - [x] Create INSERT policies for user_id = auth.uid()
  - [x] Create UPDATE policies for user_id = auth.uid()
  - [x] Create DELETE policies for user_id = auth.uid()
- [x] Task 3: Seed default categories (AC: #6)
  - [x] Create seed function or migration for default categories
  - [x] Insert: Meals & Entertainment, Transport, Housing, Utilities, Shopping, Health, Education, Other

## Dev Notes

### Architecture Context

**AD-3 — Supabase RLS as data isolation gate:**
- Every table has `user_id` column with RLS policy `user_id = auth.uid()`
- Server Actions verify ownership before mutations

**AD-10 — Entity repositories encapsulate DB access:**
- Each entity will have a repository in `entities/<name>/repository.ts`

**Data Conventions:**
- IDs: UUID v4, `id` field on every table
- Dates: ISO 8601 UTC, stored as `timestamptz`
- Amounts: Integer cents to avoid float precision issues

### Database Schema Details

**profiles table:**
- id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE
- display_name: text
- avatar_url: text
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

**categories table:**
- id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: uuid REFERENCES auth.users(id) ON DELETE CASCADE
- name: text NOT NULL
- icon: text
- color: text
- created_at: timestamptz DEFAULT now()

**expenses table:**
- id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: uuid REFERENCES auth.users(id) ON DELETE CASCADE
- amount_cents: integer NOT NULL
- currency: text NOT NULL DEFAULT 'USD'
- category_id: uuid REFERENCES categories(id)
- date: timestamptz NOT NULL
- notes: text
- tax_applicable: boolean DEFAULT false
- is_deleted: boolean DEFAULT false
- deleted_at: timestamptz
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

**settings table:**
- id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE
- base_currency: text DEFAULT 'USD'
- vat_rate: numeric(5,2) DEFAULT 16.00
- theme: text DEFAULT 'system'
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

**exchange_rates table:**
- id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
- base_currency: text NOT NULL
- target_currency: text NOT NULL
- rate: numeric NOT NULL
- fetched_at: timestamptz DEFAULT now()
- expires_at: timestamptz NOT NULL
- UNIQUE(base_currency, target_currency)

### Testing Standards

- Verify migration runs without errors
- Verify RLS policies work correctly
- Test queries with different user contexts

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created comprehensive Supabase migration with all 5 tables
- Implemented RLS policies for complete data isolation
- Added database trigger to auto-create profile, settings, and default categories on user signup
- All indexes created for optimal query performance

### File List

- supabase/migrations/001_initial_schema.sql