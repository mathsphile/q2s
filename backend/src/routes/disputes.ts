import { Router, type Request, type Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getPool } from '../db/index.js';

const disputesRouter = Router();

// ---------------------------------------------------------------------------
// Dispute and Reputation Endpoints (Task 12.3)
// Requirements: 20.1, 21.1, 21.2, 21.3
// ---------------------------------------------------------------------------

/**
 * POST /api/disputes
 *
 * Raise a dispute on a rejected submission. Inserts a record into the
 * disputes table with the ambassador's reason and notifies the admin.
 *
 * Restricted to Ambassador role.
 *
 * Requirement 20.1
 */
disputesRouter.post(
  '/',
  authenticate,
  authorize('ambassador'),
  async (req: Request, res: Response) => {
    const { submission_id, quest_id, reason } = req.body as {
      submission_id?: number;
      quest_id?: number;
      reason?: string;
    };

    // Validate required fields
    const missing: string[] = [];
    if (submission_id === undefined || submission_id === null) missing.push('submission_id');
    if (quest_id === undefined || quest_id === null) missing.push('quest_id');
    if (!reason || reason.trim().length === 0) missing.push('reason');

    if (missing.length > 0) {
      res.status(400).json({ error: 'Missing required fields', fields: missing });
      return;
    }

    try {
      const pool = getPool();
      const ambassadorId = req.user!.userId;

      // Check for existing pending dispute on the same submission
      const existing = await pool.query(
        `SELECT id FROM disputes
         WHERE submission_id = $1 AND ambassador_id = $2 AND resolution = 'pending'`,
        [submission_id, ambassadorId],
      );

      if (existing.rows.length > 0) {
        res.status(409).json({
          error: 'A pending dispute already exists for this submission',
        });
        return;
      }

      // Insert the dispute record
      const result = await pool.query(
        `INSERT INTO disputes (submission_id, quest_id, ambassador_id, reason, resolution)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, submission_id, quest_id, ambassador_id, reason, resolution, created_at`,
        [submission_id, quest_id, ambassadorId, reason!.trim()],
      );

      const dispute = result.rows[0];

      // TODO: Notify admin via WebSocket or email once notification service
      // is implemented (Requirement 20.1)

      res.status(201).json({ dispute });
    } catch (err) {
      console.error('Failed to create dispute:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// Ambassador Reputation Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/ambassadors/:id/reputation
 *
 * Get an ambassador's reputation score. Queries the users table for the
 * reputation_score field.
 *
 * Accessible to any authenticated user.
 *
 * Requirement 21.3
 */
disputesRouter.get(
  '/ambassadors/:id/reputation',
  authenticate,
  async (req: Request, res: Response) => {
    const ambassadorId = req.params.id;

    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT id, email, reputation_score, role
         FROM users
         WHERE id = $1 AND role = 'ambassador'`,
        [ambassadorId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Ambassador not found' });
        return;
      }

      const { id, email, reputation_score } = result.rows[0];

      res.json({
        ambassador: {
          id,
          email,
          reputation_score,
        },
      });
    } catch (err) {
      console.error('Failed to get reputation:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default disputesRouter;
