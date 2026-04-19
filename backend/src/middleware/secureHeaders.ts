import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that sets security-related HTTP headers on every response.
 *
 * Headers applied:
 *  - Content-Security-Policy: default-src 'self'
 *  - X-Content-Type-Options: nosniff
 *  - Strict-Transport-Security: max-age=31536000; includeSubDomains
 *  - X-Frame-Options: DENY
 *  - X-XSS-Protection: 1; mode=block
 *
 * Satisfies Requirements 27.3.
 */
export function secureHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}
