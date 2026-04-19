import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
const SESSION_DURATION_HOURS = 24;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 15;

/**
 * Check whether the given email has exceeded the failed-login rate limit.
 * Returns true if the request should be blocked.
 */
async function isRateLimited(email: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT COUNT(*)::int AS failed_count
     FROM login_attempts
     WHERE email = $1
       AND success = FALSE
       AND attempted_at > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'`,
    [email],
  );
  const failedCount: number = result.rows[0]?.failed_count ?? 0;
  return failedCount >= RATE_LIMIT_MAX_ATTEMPTS;
}

/**
 * Record a login attempt (successful or failed) in the login_attempts table.
 */
async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO login_attempts (email, success) VALUES ($1, $2)`,
    [email, success],
  );
}

/**
 * POST /api/auth/login
 *
 * Accepts { email, password } and authenticates the user.
 * Returns 200 with { token, user } on success.
 * Returns a generic 401 "Invalid credentials" on any auth failure
 * (no distinction between wrong email vs wrong password).
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  // --- Validate required fields ---
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const normalizedEmail = email.toLowerCase();

  // --- Check rate limiting ---
  const rateLimited = await isRateLimited(normalizedEmail);
  if (rateLimited) {
    res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
    return;
  }

  const pool = getPool();

  // --- Look up user by email ---
  const userResult = await pool.query(
    `SELECT id, email, password_hash, salt, role, wallet_address, is_banned, reputation_score, created_at, updated_at
     FROM users WHERE email = $1`,
    [normalizedEmail],
  );

  const user = userResult.rows[0];

  // User not found or banned — generic error
  if (!user || user.is_banned) {
    await recordLoginAttempt(normalizedEmail, false);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // --- Verify password ---
  const passwordValid = await bcrypt.compare(password + user.salt, user.password_hash);

  if (!passwordValid) {
    await recordLoginAttempt(normalizedEmail, false);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // --- Generate JWT ---
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: `${SESSION_DURATION_HOURS}h` });

  // --- Store session ---
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  );

  // --- Record successful login attempt ---
  await recordLoginAttempt(normalizedEmail, true);

  // --- Return token and user (without sensitive fields) ---
  const { password_hash: _ph, salt: _s, ...safeUser } = user;

  res.status(200).json({ token, user: safeUser });
}
