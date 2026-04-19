/**
 * Treasury client — XLM-based funding and reward distribution.
 *
 * Instead of using the Treasury smart contract with custom QUEST tokens,
 * this uses native XLM payments via standard Stellar operations.
 *
 * Flow:
 *   Fund quest:  Organizer → sends XLM to escrow address
 *   Reward:      Escrow → sends XLM to ambassador (signed by escrow/deployer)
 *
 * For the MVP, the deployer account acts as the escrow. The organizer sends
 * XLM to the deployer, and rewards are tracked off-chain. In production,
 * this would use a proper escrow contract or multisig.
 */

import { sendXlmPayment, getXlmBalance, ESCROW_ADDRESS } from './soroban';

// ── Types ──────────────────────────────────────────────────────────────

export interface BountyPool {
  quest_id: number;
  total_funded: number; // XLM amount
  distributed: number;
  organizer: string;
}

// ── In-memory pool tracking ────────────────────────────────────────────
// Since we're not using the Treasury contract, we track pools client-side.
// In production this would be stored on-chain or in a database.

const pools: Map<number, BountyPool> = new Map();

// ── Write operations ───────────────────────────────────────────────────

/**
 * Fund a quest by sending XLM from the organizer to the escrow address.
 * The amount is in XLM (e.g. 10 = 10 XLM).
 */
export async function fundQuest(
  questId: number,
  organizer: string,
  amountXlm: number,
): Promise<string> {
  if (!ESCROW_ADDRESS) {
    throw new Error('Escrow address not configured');
  }

  // Send XLM from organizer to escrow
  const txHash = await sendXlmPayment(organizer, ESCROW_ADDRESS, amountXlm);

  // Track the pool locally
  const existing = pools.get(questId);
  pools.set(questId, {
    quest_id: questId,
    total_funded: (existing?.total_funded ?? 0) + amountXlm,
    distributed: existing?.distributed ?? 0,
    organizer,
  });

  return txHash;
}

// ── Read-only operations ───────────────────────────────────────────────

/**
 * Get bounty pool info for a quest.
 */
export function getBountyPool(questId: number): BountyPool | null {
  return pools.get(questId) ?? null;
}

/**
 * Get the XLM balance for an address.
 */
export async function getWalletBalance(address: string): Promise<number> {
  return getXlmBalance(address);
}
