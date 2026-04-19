import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { getPool } from '../db/index.js';

/**
 * POST /api/auth/logout
 *
 * Invalidates the current session by removing it from the sessions table.
 * Expects the JWT in the Authorization header as "Bearer <token>".
 */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const pool = getPool();
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);

  res.status(200).json({ message: 'Logged out successfully' });
}
