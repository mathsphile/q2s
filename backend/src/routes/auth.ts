import { Router, type Request, type Response } from 'express';
import { registerHandler } from '../auth/register.js';
import { loginHandler } from '../auth/login.js';
import { refreshTokenHandler } from '../auth/token.js';
import { logoutHandler } from '../auth/logout.js';
import { authenticate } from '../middleware/auth.js';
import { getPool } from '../db/index.js';

const authRouter = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.post('/refresh', refreshTokenHandler);
authRouter.post('/logout', logoutHandler);

/**
 * PATCH /api/auth/wallet — Save the user's Stellar wallet address.
 *
 * Called by the frontend when the user connects their Freighter wallet.
 * Stores the public key in the users table so the backend can associate
 * on-chain activity with the authenticated user.
 */
authRouter.patch('/wallet', authenticate, async (req: Request, res: Response) => {
  const { wallet_address } = req.body;

  if (!wallet_address || typeof wallet_address !== 'string') {
    res.status(400).json({ error: 'wallet_address is required' });
    return;
  }

  // Basic Stellar public key validation (G… + 55 chars = 56 total)
  if (!/^G[A-Z2-7]{55}$/.test(wallet_address)) {
    res.status(400).json({ error: 'Invalid Stellar public key format' });
    return;
  }

  try {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET wallet_address = $1, updated_at = NOW() WHERE id = $2',
      [wallet_address, req.user!.userId],
    );
    res.json({ message: 'Wallet address saved' });
  } catch (err) {
    console.error('Failed to save wallet address:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default authRouter;
