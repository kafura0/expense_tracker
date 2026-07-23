# ADR-005: Security Architecture

## Status

Accepted

## Context

Ledgerly handles sensitive financial data and must protect user information against common web vulnerabilities:

- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- SQL Injection
- Session hijacking
- Data exposure

## Decision

We will implement a **defense-in-depth** security architecture with multiple layers.

### Security Layers

1. **Transport Security**
   - HTTPS enforced in production
   - HSTS headers with long max-age
   - Secure cookie attributes

2. **Application Security**
   - Content Security Policy (CSP) headers
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin

3. **Authentication Security**
   - Supabase Auth with JWT tokens
   - httpOnly cookies for session storage
   - Session refresh on every request
   - No user enumeration in error messages

4. **Authorization Security**
   - Row-Level Security (RLS) on all tables
   - Middleware-level route protection
   - Server-side validation on all inputs

5. **Input Validation**
   - Zod schemas for all user inputs
   - String sanitization (XSS prevention)
   - Type checking at runtime

6. **Rate Limiting**
   - Auth endpoints: 5 requests/minute
   - API endpoints: 60 requests/minute
   - General: 100 requests/minute

7. **Audit Logging**
   - Track sensitive operations
   - Record user actions for compliance
   - Non-blocking implementation

### Implementation Details

```typescript
// Middleware stack
1. Rate limiting
2. Security headers
3. Session management
4. Route protection
5. Org validation
```

## Consequences

### Positive

- Comprehensive protection against common attacks
- Compliance with security best practices
- Defense-in-depth reduces risk of single point of failure
- Audit trail for incident response

### Negative

- Performance overhead from multiple security checks
- Complexity in implementation and maintenance
- CSP may block some legitimate resources
- Rate limiting may affect legitimate high-volume users

### Mitigations

- Optimize security checks for performance
- Regular security audits and updates
- Configurable CSP for different environments
- Rate limit exceptions for known good actors

## Alternatives Considered

1. **Security through obscurity** — Rejected: Not real security
2. **Client-side only security** — Rejected: Easily bypassed
3. **Third-party security service** — Considered for future (Cloudflare)

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth)
