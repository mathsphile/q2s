import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
const SESSION_DURATION_HOURS = 24;

/** Threshold in seconds — if the token expires within this window, it is eligible for refresh. */
const REFRESH_THRESHOLD_SECONDS = 60 * 60; // 1 hour

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verify a JWT string.
 *
 * Validates the signature and expiration. Returns the decoded payload on
 * success, or throws an error when the token is invalid / expired.
 */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & TokenPayload;
  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}

/**
 * Express handler: POST /api/auth/refresh
 *
 * Extracts the JWT from the Authorization header, verifies it, and — if the
 * token is within the refresh threshold — issues a fresh token with a new
 * expiry. The old session is removed and a new one is stored.
 */
export async function refreshTokenHandler(
  req: import('express').Request,
  res: import('express').Response,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const oldToken = authHeader.slice(7); // strip "Bearer "

  let payload: TokenPayload;
  try {
    payload = verifyToken(oldToken);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Decode without verification to read the `exp` claim
  const decoded = jwt.decode(oldToken) as jwt.JwtPayload | null;
  if (!decoded || typeof decoded.exp !== 'number') {
    res.status(401).json({ error: 'Invalid token payload' });
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const secondsUntilExpiry = decoded.exp - nowSeconds;

  if (secondsUntilExpiry > REFRESH_THRESHOLD_SECONDS) {
    res.status(200).json({ message: 'Token is not yet eligible for refresh', refreshed: false });
    return;
  }

  // Issue a new token
  const newTokenPayload: TokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  const newToken = jwt.sign(newTokenPayload, JWT_SECRET, {
    expiresIn: `${SESSION_DURATION_HOURS}h`,
  });

  const pool = getPool();

  // Remove old session
  const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [oldTokenHash]);

  // Store new session
  const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [payload.userId, newTokenHash, expiresAt],
  );

  res.status(200).json({ token: newToken, refreshed: true });
}
