import { Router, type Request, type Response } from 'express';

/**
 * Quest and Submission routes — DEPRECATED
 *
 * All quest, submission, funding, and reward operations now happen on-chain
 * via Soroban smart contracts. The frontend talks directly to Soroban RPC.
 *
 * These routers are kept as empty stubs so existing route mounts in index.ts
 * don't break. They return 410 Gone for any requests.
 */

const questsRouter = Router();

questsRouter.all('*path', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'Quest operations have moved on-chain. Use the Soroban contracts directly.',
  });
});

const submissionsRouter = Router();

submissionsRouter.all('*path', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'Submission operations have moved on-chain. Use the Soroban contracts directly.',
  });
});

export { submissionsRouter };
export default questsRouter;
