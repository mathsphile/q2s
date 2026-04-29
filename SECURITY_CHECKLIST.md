# Security Checklist — Quest@Stellar

## Authentication & Authorization

- [x] Passwords hashed with bcrypt (12 rounds, unique salt per user)
- [x] JWT tokens with expiration (24h)
- [x] Session stored in database with token hash
- [x] Rate limiting on login (10 attempts / 15 min per email)
- [x] Generic error messages (no email/password distinction)
- [x] Admin registration blocked from API (database only)
- [x] Role-based access control (admin, organizer, ambassador)
- [x] Token refresh mechanism

## Input Validation

- [x] Email format validation (client + server)
- [x] Password minimum length (8 chars)
- [x] Required field validation on all forms
- [x] Stellar public key format validation (G + 55 alphanumeric)
- [x] Smart contract parameter validation (amount > 0, non-empty strings)
- [x] HTML tag stripping in text inputs (XSS prevention)

## Network Security

- [x] CSRF protection (double-submit cookie pattern)
- [x] Constant-time CSRF token comparison (timing attack prevention)
- [x] Security headers: Content-Security-Policy, X-Content-Type-Options, HSTS, X-Frame-Options, X-XSS-Protection
- [x] CORS configured for production origins
- [x] HTTPS enforced via HSTS header

## Smart Contract Security

- [x] Re-initialization prevention (initialize can only be called once)
- [x] Authorization checks (require_auth on all state-changing functions)
- [x] Organizer-only access for quest management
- [x] Duplicate submission prevention
- [x] Deadline validation for submissions
- [x] State machine enforcement (invalid transitions rejected)
- [x] Balance validation before transfers
- [x] Max supply overflow check on token minting

## Wallet Security

- [x] Freighter wallet integration (no private keys stored)
- [x] Transaction signing via browser extension (never server-side)
- [x] Wallet address verified against Freighter on page load
- [x] Wallet state persisted in localStorage (cleared on disconnect)

## Data Protection

- [x] No secrets in git repository (.env files in .gitignore)
- [x] Database credentials via environment variables
- [x] SSL/TLS for database connections (Neon PostgreSQL)
- [x] Password hash and salt excluded from API responses
- [x] JWT secret configurable via environment variable

## Infrastructure

- [x] Vercel deployment with security headers
- [x] Neon PostgreSQL with SSL required
- [x] GitHub Actions CI/CD pipeline
- [x] Separate frontend and backend services
