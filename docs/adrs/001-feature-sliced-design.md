# ADR-001: Feature-Sliced Design Architecture

## Status

Accepted

## Context

Ledgerly needs a scalable, maintainable frontend architecture that can grow with the product from MVP to 10,000+ users. The codebase must be:

- Easy to navigate for new developers
- resistant to spaghetti code as features grow
- Testable at all layers
- Aligned with React/Next.js best practices

## Decision

We will use **Feature-Sliced Design (FSD)** as our frontend architecture methodology.

### Layer Structure

```
src/
  app/          # Next.js App Router pages and layouts
  widgets/      # Composite UI blocks (dashboard, expense-list)
  features/     # User interactions (auth, expenses CRUD, settings)
  entities/     # Business entities (expense, category, exchange-rate)
  shared/       # Reusable UI, utils, types, API clients
  processes/    # Cross-cutting workflows (if needed)
```

### Key Principles

1. **Strict layer boundaries** — Each layer can only import from layers below it
2. **Public API** — Each module exports through a public API (index.ts)
3. **Server Components by default** — Client components only where interactivity required
4. **Server Actions for mutations** — No direct DB access from client components

## Consequences

### Positive

- Clear code organization and discoverability
- Easy to refactor and move features
- Better tree-shaking and code splitting
- Natural boundaries for testing
- Scales from small to large teams

### Negative

- Initial learning curve for developers unfamiliar with FSD
- More files and directories than flat structures
- May feel over-engineered for very small features

### Mitigations

- Comprehensive documentation and examples
- ESLint rules to enforce layer boundaries
- Gradual adoption is possible (start with shared + entities)

## Alternatives Considered

1. **Flat structure** — Rejected: Becomes unmaintainable at scale
2. **Domain-Driven Design** — Considered but FSD is more practical for frontend
3. **Atomic Design** — Rejected: Too focused on UI components, not business logic

## References

- [Feature-Sliced Design Documentation](https://feature-sliced.design/)
- [Next.js App Router](https://nextjs.org/docs/app)
