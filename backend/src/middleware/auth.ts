import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type TokenPayload } from '../auth/token.js';

/**
 * Extend the Express Request interface to include the authenticated user
 * payload. Populated by the `authenticate` middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware.
 *
 * Extracts the JWT from the `Authorization: Bearer <token>` header, verifies
 * it using `verifyToken`, and attaches the decoded payload to `req.user`.
 *
 * Returns 401 if the header is missing, malformed, or the token is
 * invalid/expired.
 *
 * Satisfies Requirements 3.5 (unauthenticated access denial).
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authorization middleware factory.
 *
 * Returns middleware that checks whether the authenticated user's role is
 * included in the list of allowed roles. Must be used **after** `authenticate`.
 *
 * Returns 403 if the user's role is not permitted for the route.
 *
 * Satisfies Requirements 3.1, 3.2, 3.3, 3.4.
 *
 * @example
 * router.get('/admin/users', authenticate, authorize('admin'), handler);
 * router.get('/organizer/quests', authenticate, authorize('organizer'), handler);
 * router.get('/shared', authenticate, authorize('admin', 'organizer'), handler);
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      // Should not happen if `authenticate` runs first, but guard defensively.
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
