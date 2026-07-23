# ADR-004: Testing Strategy with Vitest

## Status

Accepted

## Context

Ledgerly needs comprehensive testing to ensure reliability as it scales to 10,000+ users. Testing must cover:

- Business logic (VAT calculations, currency conversion)
- API routes and server actions
- React components
- End-to-end user flows

## Decision

We will use **Vitest** as our primary testing framework with the following strategy:

### Test Types

1. **Unit Tests** — Pure functions in `shared/lib/`
   - VAT engine calculations
   - CSV/PDF export logic
   - Utility functions
   - Target: 80%+ coverage

2. **Integration Tests** — Server actions and API routes
   - Mock external dependencies (Supabase)
   - Test error handling
   - Verify data flow

3. **Component Tests** — React components (future)
   - Using React Testing Library
   - Test user interactions
   - Accessibility testing

4. **E2E Tests** — Full user flows (future)
   - Using Playwright or Cypress
   - Critical paths only

### Testing Tools

- **Vitest** — Test runner and assertion library
- **React Testing Library** — Component testing utilities
- **jsdom** — Browser environment simulation
- **MSW** (future) — API mocking for integration tests

### File Organization

```
tests/
  unit/           # Unit tests
  integration/    # Integration tests
  e2e/           # End-to-end tests (future)
  setup.ts       # Global test setup
```

## Consequences

### Positive

- Fast test execution with Vitest
- TypeScript support out of the box
- Compatible with Jest APIs (easy migration)
- Good Next.js integration
- Coverage reporting built-in

### Negative

- Learning curve for developers new to Vitest
- Mocking can be complex for server actions
- Some Next.js features require special test setup

### Mitigations

- Comprehensive test examples in codebase
- Shared test utilities and helpers
- Regular test reviews and updates

## Alternatives Considered

1. **Jest** — Considered but Vitest is faster with ESM
2. **Cypress** — Rejected for unit/integration (better for E2E)
3. **Playwright** — Considered for future E2E tests

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
