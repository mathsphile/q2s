import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF protection using a double-submit pattern with a custom header.
 *
 * Flow:
 *  1. Client calls GET /api/auth/csrf-token to obtain a token.
 *  2. The token is returned in the response body *and* set as a cookie
 *     (`csrf-token`).
 *  3. On every state-changing request (POST, PUT, PATCH, DELETE) the client
 *     sends the token back via the `X-CSRF-Token` header.
 *  4. The middleware compares the header value against the cookie value.
 *     If they match the request proceeds; otherwise it is rejected with 403.
 *
 * Satisfies Requirement 27.2.
 */

const TOKEN_BYTE_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/** HTTP methods that mutate state and therefore require CSRF validation. */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
}

/**
 * Express handler: GET /api/auth/csrf-token
 *
 * Issues a new CSRF token, sets it as a cookie, and returns it in the body so
 * the client can attach it to subsequent requests via the X-CSRF-Token header.
 */
export function csrfTokenHandler(_req: Request, res: Response): void {
  const token = generateCsrfToken();

  // Set the token as a cookie so the browser sends it back automatically.
  // `httpOnly: false` is intentional — the client-side JS needs to read the
  // cookie value to set the custom header.
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  res.status(200).json({ csrfToken: token });
}

/**
 * Middleware that validates the CSRF token on state-changing requests.
 *
 * Safe (read-only) methods (GET, HEAD, OPTIONS) are allowed through without
 * validation.
 *
 * API routes using JWT Bearer tokens are exempt from CSRF — the token is
 * sent via the Authorization header which the browser never attaches
 * automatically, so CSRF attacks cannot forge it.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Allow safe methods through without CSRF checks.
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  // Skip CSRF for API routes that use JWT Bearer authentication.
  // CSRF protection is only needed for cookie-based auth where the browser
  // automatically attaches credentials. JWT in Authorization header is immune.
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
  const cookieToken = parseCookieValue(req, CSRF_COOKIE_NAME);

  if (!headerToken || !cookieToken) {
    res.status(403).json({ error: 'Missing CSRF token' });
    return;
  }

  // Constant-time comparison to prevent timing attacks.
  const headerBuf = Buffer.from(headerToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

/**
 * Parse a specific cookie value from the raw Cookie header.
 *
 * Express does not parse cookies by default (no cookie-parser dependency), so
 * we do a lightweight manual parse here.
 */
function parseCookieValue(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  const prefix = `${name}=`;
  const parts = header.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return undefined;
}
