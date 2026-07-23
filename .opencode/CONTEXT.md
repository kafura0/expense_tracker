# Ledgerly - Project Context

## Project Overview

**Ledgerly** is a premium personal finance and expense management SaaS application built with Next.js 16, Supabase, and Tailwind CSS. The application is designed to handle 10,000+ paying users with production-grade quality.

**Tech Stack:**
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Recharts
- Backend: Supabase (PostgreSQL, Auth, RLS)
- Testing: Vitest, React Testing Library
- Deployment: Vercel
- Exchange Rates: Frankfurter API (ECB data)

**Architecture:** Feature-Sliced Design (FSD) with layers: app/, widgets/, features/, entities/, shared/, processes/

## Current Status: ALL PHASES COMPLETE + ZERO LINT ERRORS

### Epics 1-5: Core Features [DONE]

**Epic 1: Project Foundation & Auth**
- 1.1 Initialize Next.js with FSD structure
- 1.2 Configure Supabase database schema
- 1.3 Implement email authentication
- 1.4 Create shared UI kit (shadcn/ui)

**Epic 2: Expense CRUD**
- 2.1 Create expense entity & repository
- 2.2 Build expense list page
- 2.3 Build create & edit expense forms
- 2.4 Implement delete, undo delete, and duplicate

**Epic 3: Dashboard & Analytics**
- 3.1 Build KPI cards
- 3.2 Build spending charts
- 3.3 Build recent activity & insights

**Epic 4: Multi-Currency & VAT Engine**
- 4.1 Implement exchange rate service
- 4.2 Build currency conversion on expenses
- 4.3 Implement VAT/tax engine

**Epic 5: Settings, Export & PWA**
- 5.1 Build settings page
- 5.2 Implement CSV and PDF export
- 5.3 Implement PWA support

### Phase 6: Testing Infrastructure & Critical Path Tests [DONE]

**Testing Framework:** Vitest with React Testing Library

**Test Files:**
- `tests/unit/vat.test.ts` - VAT engine tests (43 tests)
- `tests/unit/utils.test.ts` - Utility function tests
- `tests/unit/csv-export.test.ts` - CSV export tests
- `tests/unit/pdf-export.test.ts` - PDF export tests
- `tests/integration/expense-actions.test.ts` - Server action tests
- `tests/integration/api-routes.test.ts` - API route tests

**Test Commands:**
```bash
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

**Test Coverage:** 59 tests passing

### Phase 7: Security Hardening & Validation [DONE]

**Security Features Implemented:**

1. **Rate Limiting** (`shared/lib/rate-limit.ts`)
   - Auth endpoints: 5 requests/minute
   - API endpoints: 60 requests/minute
   - General: 100 requests/minute

2. **Security Headers** (`shared/lib/security-headers.ts`)
   - Content Security Policy (CSP)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - HSTS (production only)

3. **CSRF Protection** (`shared/lib/csrf.ts`)
   - Token generation and validation
   - httpOnly cookie storage

4. **Input Validation** (`entities/expense/schema.ts`)
   - Zod schemas with string sanitization
   - Amount limits (max $1,000,000)
   - XSS prevention

5. **Audit Logging** (`shared/lib/audit-logger.ts`)
   - Track sensitive operations
   - Non-blocking implementation

### Phase 8: Scalability & Performance [DONE]

**Performance Features:**

1. **Database Optimization** (`supabase/migrations/002_performance_optimization.sql`)
   - Composite indexes for common queries
   - Partial indexes for filtered queries
   - Table statistics updated

2. **Caching Service** (`shared/lib/cache.ts`)
   - In-memory cache with TTL
   - Cache key generators
   - Automatic cleanup

3. **Performance Monitoring** (`shared/lib/performance.ts`)
   - Execution time measurement
   - P95 duration tracking
   - React component render timing

### Phase 9: Documentation & DevOps [DONE]

**Documentation:**
- `docs/API.md` - Comprehensive API documentation
- `docs/adrs/` - Architecture Decision Records (5 ADRs)

**ADRs Created:**
1. ADR-001: Feature-Sliced Design Architecture
2. ADR-002: Supabase for Backend Services
3. ADR-003: Server Actions for Mutations
4. ADR-004: Testing Strategy with Vitest
5. ADR-005: Security Architecture

**CI/CD Pipeline:**
- `.github/workflows/ci.yml` - GitHub Actions workflow
- Lint, test, build, deploy stages
- Automatic preview deployments for PRs

## Key Files & Locations

### Business Logic (shared/lib/)
- `vat.ts` - VAT calculation engine (pure functions)
- `csv-export.ts` - CSV generation
- `pdf-export.ts` - PDF generation with jsPDF
- `utils.ts` - cn() utility for Tailwind
- `rate-limit.ts` - Rate limiting middleware
- `security-headers.ts` - Security headers
- `csrf.ts` - CSRF protection
- `audit-logger.ts` - Audit logging
- `cache.ts` - Caching service
- `performance.ts` - Performance monitoring

### Testing
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/setup.ts` - Test setup
- `vitest.config.ts` - Vitest configuration

### Security & Middleware
- `src/middleware.ts` - Main middleware (rate limiting + security)
- `src/shared/lib/supabase/middleware.ts` - Auth middleware

### Database
- `supabase/migrations/001_initial_schema.sql` - Initial schema
- `supabase/migrations/002_performance_optimization.sql` - Performance indexes

### Documentation
- `docs/API.md` - API documentation
- `docs/adrs/` - Architecture Decision Records

### CI/CD
- `.github/workflows/ci.yml` - GitHub Actions pipeline

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (server only)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CSRF_SECRET=your-csrf-secret (optional, falls back to anon key)
```

## Demo Credentials

- Email: admin@ledgerly.app
- Password: 123456

## Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run lint          # Run ESLint
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
npm run seed          # Seed demo data
npx vercel --prod     # Deploy to Vercel
```

## Important Notes

1. **All amounts stored as integer cents** - Never use floats for money
2. **RLS on all tables** - user_id = auth.uid() enforced at database level
3. **Server Actions only** - No direct DB access from client components
4. **Zod schemas** - Single validation source shared between client/server
5. **FSD architecture** - Strict layer boundaries enforced
6. **Security middleware** - Rate limiting + security headers on all requests
7. **Test coverage** - 59 tests covering critical business logic
8. **Zero lint errors** - Full ESLint compliance across all files

## Production Readiness Checklist

- [x] Core features implemented (Epics 1-5)
- [x] Testing infrastructure (Vitest + React Testing Library)
- [x] 59 unit and integration tests passing
- [x] Rate limiting on all endpoints
- [x] Security headers (CSP, HSTS, etc.)
- [x] CSRF protection
- [x] Input validation with Zod
- [x] Audit logging
- [x] Database optimization indexes
- [x] Caching service
- [x] Performance monitoring
- [x] API documentation
- [x] Architecture Decision Records
- [x] CI/CD pipeline
- [x] Zero lint errors (ESLint + React Compiler)

---

*Last updated: July 23, 2026*
*Project: Ledgerly (ExpenseOS)*
*Status: All phases complete - Production ready*
