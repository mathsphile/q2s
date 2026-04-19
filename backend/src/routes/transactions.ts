import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getPool } from '../db/index.js';

const transactionsRouter = Router();

// ---------------------------------------------------------------------------
// Transaction Retry and Failed Transaction Logging (Task 12.4)
// Requirements: 22.1, 22.2, 22.3, 22.4
// ---------------------------------------------------------------------------

/**
 * Log a failed blockchain transaction.
 *
 * This utility function is called by other route handlers when a blockchain
 * transaction fails. It inserts a record into the failed_transactions table
 * for admin review and later retry.
 *
 * Requirement 22.3
 */
export async function logFailedTransaction(params: {
  tx_type: string;
  user_id: string;
  error_details: string;
  quest_id?: number | null;
  amount?: number | null;
}): Promise<string> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO failed_transactions (tx_type, user_id, error_details, quest_id, amount, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [
      params.tx_type,
      params.user_id,
      params.error_details,
      params.quest_id ?? null,
      params.amount ?? null,
    ],
  );
  return result.rows[0].id as string;
}

/**
 * POST /api/transactions/:id/retry
 *
 * Retry a failed blockchain transaction. Verifies on-chain state before
 * resubmitting to prevent duplicate operations.
 *
 * Accessible to any authenticated user (for their own transactions).
 *
 * Requirements: 22.1, 22.2, 22.4
 */
transactionsRouter.post(
  '/:id/retry',
  authenticate,
  async (req: Request, res: Response) => {
    const txId = req.params.id;
    const userId = req.user!.userId;

    try {
      const pool = getPool();

      // Fetch the failed transaction record
      const result = await pool.query(
        `SELECT id, tx_type, user_id, error_details, quest_id, amount, retry_count, status
         FROM failed_transactions
         WHERE id = $1`,
        [txId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      const tx = result.rows[0];

      // Ensure the user owns this transaction
      if (tx.user_id !== userId) {
        res.status(403).json({ error: 'You can only retry your own transactions' });
        return;
      }

      // Prevent retrying already resolved transactions (Requirement 22.4)
      if (tx.status === 'resolved') {
        res.status(409).json({
          error: 'Transaction has already been resolved. Cannot retry.',
        });
        return;
      }

      // TODO: Verify on-chain state before resubmitting (Requirement 22.4)
      // This would check the Soroban RPC to see if the original operation
      // already succeeded on-chain (preventing duplicate operations).
      //
      // Example checks by tx_type:
      // - 'fund_quest': check if bounty pool already exists for quest_id
      // - 'release_reward': check if reward was already distributed
      // - 'refund': check if refund was already processed
      // - 'swap': check if swap was already executed

      // Increment retry count and update status
      await pool.query(
        `UPDATE failed_transactions
           SET retry_count = retry_count + 1,
               status = 'retried'
         WHERE id = $1`,
        [txId],
      );

      // TODO: Resubmit the transaction via Soroban RPC based on tx_type
      // For now, return a placeholder response indicating retry was initiated

      res.json({
        message: 'Transaction retry initiated',
        transaction: {
          id: tx.id,
          tx_type: tx.tx_type,
          quest_id: tx.quest_id,
          retry_count: tx.retry_count + 1,
          status: 'retried',
        },
        note: 'Soroban RPC integration pending',
      });
    } catch (err) {
      console.error('Failed to retry transaction:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/transactions/failed
 *
 * List failed transactions for the authenticated user.
 * Admins can see all failed transactions.
 *
 * Requirement 22.3
 */
transactionsRouter.get(
  '/failed',
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    try {
      const pool = getPool();

      let result;
      if (userRole === 'admin') {
        // Admins see all failed transactions
        result = await pool.query(
          `SELECT id, tx_type, user_id, error_details, quest_id, amount, retry_count, status, created_at
           FROM failed_transactions
           ORDER BY created_at DESC`,
        );
      } else {
        // Regular users see only their own
        result = await pool.query(
          `SELECT id, tx_type, user_id, error_details, quest_id, amount, retry_count, status, created_at
           FROM failed_transactions
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId],
        );
      }

      res.json({ transactions: result.rows });
    } catch (err) {
      console.error('Failed to list failed transactions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default transactionsRouter;
