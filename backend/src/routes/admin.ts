import { Router, type Request, type Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getPool } from '../db/index.js';

const adminRouter = Router();

// All admin routes require authentication + admin role (Requirement 15.4)
adminRouter.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/users
 *
 * List all registered users with role, registration date, account status,
 * and wallet connection status.
 *
 * Requirement 15.3
 */
adminRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, email, role, wallet_address, is_banned, reputation_score, created_at
       FROM users
       ORDER BY created_at DESC`,
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Failed to list users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:id/ban
 *
 * Ban a user account: set is_banned = true and revoke all active sessions.
 *
 * Requirements 15.1, 15.4
 */
adminRouter.post('/users/:id/ban', async (req: Request, res: Response) => {
  const { id } = req.params;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify the target user exists
    const userResult = await client.query('SELECT id, is_banned FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (userResult.rows[0].is_banned) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'User is already banned' });
      return;
    }

    // Ban the user
    await client.query('UPDATE users SET is_banned = true, updated_at = NOW() WHERE id = $1', [id]);

    // Revoke all active sessions (Requirement 15.1)
    await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);

    await client.query('COMMIT');

    res.json({ message: 'User banned successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to ban user:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/users/:id/unban
 *
 * Unban a previously banned user account, restoring login access.
 *
 * Requirements 15.2, 15.4
 */
adminRouter.post('/users/:id/unban', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const pool = getPool();

    // Verify the target user exists
    const userResult = await pool.query('SELECT id, is_banned FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!userResult.rows[0].is_banned) {
      res.status(409).json({ error: 'User is not banned' });
      return;
    }

    // Unban the user
    await pool.query('UPDATE users SET is_banned = false, updated_at = NOW() WHERE id = $1', [id]);

    res.json({ message: 'User unbanned successfully' });
  } catch (err) {
    console.error('Failed to unban user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Platform Monitoring Endpoints (Requirement 16)
// ---------------------------------------------------------------------------

/**
 * In-memory store for flagged quests.
 * Maps quest ID → flag metadata. In production this would be backed by a
 * database table or on-chain state; for now we keep it in memory.
 */
const flaggedQuests: Map<
  string,
  { flaggedAt: string; reason: string; adminId: string }
> = new Map();

/**
 * GET /api/admin/analytics
 *
 * Return platform-wide statistics: total users by role, quests by state,
 * funds locked in Treasury, and total QUEST tokens distributed.
 *
 * Eventually these numbers will be sourced from on-chain data via Soroban RPC.
 * For now the endpoint returns structured placeholder data.
 *
 * Requirement 16.1
 */
adminRouter.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Real user counts from PostgreSQL
    const usersByRole = await pool.query(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`,
    );

    // Placeholder on-chain data (will be replaced with Soroban RPC calls)
    const analytics = {
      usersByRole: usersByRole.rows as { role: string; count: number }[],
      questsByState: {
        draft: 0,
        active: 0,
        inReview: 0,
        completed: 0,
        cancelled: 0,
      },
      fundsLocked: 0,
      tokensDistributed: 0,
    };

    res.json(analytics);
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/quests
 *
 * List all quests with their current state, organizer, funding status, and
 * submission count. Data will eventually come from the Quest and Treasury
 * contracts via Soroban RPC.
 *
 * Requirement 16.2
 */
adminRouter.get('/quests', async (_req: Request, res: Response) => {
  try {
    // Placeholder — will be replaced with Soroban RPC queries
    const quests: Array<{
      id: number;
      title: string;
      state: string;
      organizer: string;
      fundingStatus: { totalFunded: number; distributed: number; remaining: number };
      submissionCount: number;
      flagged: boolean;
    }> = [];

    res.json({ quests });
  } catch (err) {
    console.error('Failed to fetch quests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/quests/:id/flag
 *
 * Flag a quest for review. Suspends new submissions and notifies the
 * organizer. Since quests live on-chain, we store the flag status in memory
 * for now and will integrate with the Quest contract in a future task.
 *
 * Requirement 16.3
 */
adminRouter.post('/quests/:id/flag', async (req: Request, res: Response) => {
  const questId = req.params.id as string;
  const { reason } = req.body as { reason?: string };

  if (!reason || reason.trim().length === 0) {
    res.status(400).json({ error: 'A reason is required when flagging a quest' });
    return;
  }

  try {
    const adminId = req.user?.userId ?? 'unknown';

    flaggedQuests.set(questId, {
      flaggedAt: new Date().toISOString(),
      reason: reason.trim(),
      adminId,
    });

    // TODO: Notify organizer (email / WebSocket push) once notification
    // service is implemented.
    // TODO: Invoke Quest contract to suspend submissions once Soroban RPC
    // integration is in place.

    res.json({
      message: 'Quest flagged successfully',
      questId,
      flaggedAt: flaggedQuests.get(questId)!.flaggedAt,
    });
  } catch (err) {
    console.error('Failed to flag quest:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/pool-stats
 *
 * Return Liquidity Pool statistics: current reserves, total swap volume,
 * and LP token supply. Data will eventually come from the Liquidity Pool
 * contract via Soroban RPC.
 *
 * Requirement 16.4
 */
adminRouter.get('/pool-stats', async (_req: Request, res: Response) => {
  try {
    // Placeholder — will be replaced with Soroban RPC queries to the LP contract
    const poolStats = {
      questReserve: 0,
      xlmReserve: 0,
      totalSwapVolume: 0,
      lpTokenSupply: 0,
    };

    res.json(poolStats);
  } catch (err) {
    console.error('Failed to fetch pool stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Dispute Management Endpoints (Requirements 20.2, 20.3, 20.4)
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/disputes
 *
 * List all disputes with the original submission context, rejection reason,
 * ambassador details, and dispute reason.
 *
 * Requirement 20.2
 */
adminRouter.get('/disputes', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         d.id,
         d.submission_id,
         d.quest_id,
         d.ambassador_id,
         u.email       AS ambassador_email,
         u.wallet_address AS ambassador_wallet,
         d.reason,
         d.resolution,
         d.admin_id,
         d.created_at,
         d.resolved_at
       FROM disputes d
       LEFT JOIN users u ON u.id = d.ambassador_id
       ORDER BY d.created_at DESC`,
    );

    res.json({ disputes: result.rows });
  } catch (err) {
    console.error('Failed to list disputes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/disputes/:id/resolve
 *
 * Resolve a dispute. Accepts a `resolution` in the request body:
 *   - "ambassador_wins" — approve the submission and trigger reward distribution
 *   - "organizer_wins"  — close the dispute, retain original rejection
 *
 * Requirements 20.3, 20.4
 */
adminRouter.post('/disputes/:id/resolve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolution } = req.body as { resolution?: string };

  if (!resolution || !['ambassador_wins', 'organizer_wins'].includes(resolution)) {
    res.status(400).json({
      error: 'Invalid resolution. Must be "ambassador_wins" or "organizer_wins".',
    });
    return;
  }

  try {
    const pool = getPool();
    const adminId = req.user?.userId ?? null;

    // Verify the dispute exists and is still pending
    const disputeResult = await pool.query(
      'SELECT id, resolution FROM disputes WHERE id = $1',
      [id],
    );

    if (disputeResult.rows.length === 0) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    const existing = disputeResult.rows[0];
    if (existing.resolution && existing.resolution !== 'pending') {
      res.status(409).json({ error: 'Dispute has already been resolved' });
      return;
    }

    // Update the dispute record
    await pool.query(
      `UPDATE disputes
         SET resolution = $1,
             admin_id   = $2,
             resolved_at = NOW()
       WHERE id = $3`,
      [resolution, adminId, id],
    );

    if (resolution === 'ambassador_wins') {
      // TODO: Invoke Quest Contract approve_submission and trigger Treasury
      // reward distribution via Soroban RPC once on-chain integration is in
      // place. The dispute record contains submission_id and quest_id needed
      // for the cross-contract call.
      res.json({
        message: 'Dispute resolved in favor of ambassador. Reward distribution pending on-chain approval.',
        disputeId: id,
        resolution,
      });
    } else {
      // organizer_wins — close the dispute, original rejection stands
      res.json({
        message: 'Dispute resolved in favor of organizer. Original rejection retained.',
        disputeId: id,
        resolution,
      });
    }
  } catch (err) {
    console.error('Failed to resolve dispute:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default adminRouter;
