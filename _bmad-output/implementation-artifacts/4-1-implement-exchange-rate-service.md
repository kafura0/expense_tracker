# Story 4.1: Implement Exchange Rate Service

Status: ready-for-dev

## Story

As a developer,
I want to create the currency exchange service with Frankfurter API integration and caching,
so that expenses can be converted between currencies reliably.

## Acceptance Criteria

1. Exchange rate service fetches from Frankfurter API
2. Rates cached in exchange_rates table (1 hour TTL)
3. Fallback to stale cache when API fails
4. Manual refresh button available
5. API timeout: 5 seconds
6. Supported currencies: KES, USD, EUR, GBP, CAD, AUD, JPY
7. Route Handler: GET /api/rates?base=USD

## Tasks / Subtasks

- [ ] Task 1: Create exchange rate repository (AC: #2, #3)
  - [ ] Create `src/entities/exchange-rate/repository.ts`
  - [ ] Find latest rates by base currency
  - [ ] Upsert rates
  - [ ] Check if rates are stale (> 1 hour)
- [ ] Task 2: Create exchange rate service (AC: #1, #5, #6)
  - [ ] Create `src/entities/exchange-rate/service.ts`
  - [ ] Fetch from Frankfurter API
  - [ ] Cache in database
  - [ ] Fallback to stale cache on error
  - [ ] 5 second timeout
- [ ] Task 3: Create API route handler (AC: #7)
  - [ ] Create `src/app/api/rates/route.ts`
  - [ ] GET handler with base query param
- [ ] Task 4: Create manual refresh button (AC: #4)
  - [ ] Create `src/features/exchange-rates/refresh-button.tsx`

## Dev Notes

### Architecture Context

**AD-2 — Repository Pattern:**
- Repository handles DB operations
- Service handles external API calls

### External APIs

- Frankfurter API: https://api.frankfurter.app
- No API key required
- Rates: /latest?from=USD&to=EUR,GBP

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created exchange rate types, repository, and service
- Integrated with Frankfurter API
- Added caching with 1 hour TTL
- Created API route handler
- Created refresh button

### File List

- src/entities/exchange-rate/types.ts
- src/entities/exchange-rate/repository.ts
- src/entities/exchange-rate/service.ts
- src/app/api/rates/route.ts
- src/features/exchange-rates/refresh-button.tsx