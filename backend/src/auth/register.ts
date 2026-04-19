import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { getPool } from '../db/index.js';
import type { UserRole } from '../db/index.js';

const VALID_ROLES: UserRole[] = ['organizer', 'ambassador'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

/**
 * POST /api/auth/register
 *
 * Ambassador: { email, password, role, full_name }
 * Organizer:  { email, password, role, full_name, org_name, org_size, country, state_province, phone, website }
 */
export async function registerHandler(req: Request, res: Response): Promise<void> {
  const {
    email, password, role, full_name,
    org_name, org_size, country, state_province, phone, website,
  } = req.body as Record<string, string | undefined>;

  // Required fields
  if (!email || !password || !role) {
    res.status(400).json({ error: 'email, password, and role are required' });
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    return;
  }

  if (!VALID_ROLES.includes(role as UserRole)) {
    res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    return;
  }

  if (!full_name?.trim()) {
    res.status(400).json({ error: 'Full name is required' });
    return;
  }

  // Organizer-specific validation
  if (role === 'organizer') {
    if (!org_name?.trim()) {
      res.status(400).json({ error: 'Organization name is required' });
      return;
    }
    if (!country?.trim()) {
      res.status(400).json({ error: 'Country is required' });
      return;
    }
  }

  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password + salt, BCRYPT_ROUNDS);

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, salt, role, full_name, org_name, org_size, country, state_province, phone, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, email, role, full_name, org_name, wallet_address, is_banned, reputation_score, created_at, updated_at`,
      [
        email.toLowerCase(),
        passwordHash,
        salt,
        role,
        full_name?.trim() ?? null,
        org_name?.trim() ?? null,
        org_size?.trim() ?? null,
        country?.trim() ?? null,
        state_province?.trim() ?? null,
        phone?.trim() ?? null,
        website?.trim() ?? null,
      ],
    );

    const user = result.rows[0];
    res.status(201).json({ user });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'Email is already in use' });
      return;
    }
    throw err;
  }
}
