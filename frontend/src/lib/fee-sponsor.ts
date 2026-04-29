/**
 * Fee Sponsorship utility — checks if a user needs fee sponsorship
 * and provides helper functions for gasless transactions.
 */

import { hasEnoughForFees } from './soroban';

/**
 * Determine if a user qualifies for fee sponsorship.
 * Ambassadors with low XLM balance get their fees sponsored.
 */
export async function needsSponsorship(address: string): Promise<boolean> {
  const hasEnough = await hasEnoughForFees(address);
  return !hasEnough;
}

/**
 * Get a human-readable fee sponsorship status message.
 */
export function getSponsorshipMessage(sponsored: boolean): string {
  if (sponsored) {
    return 'Transaction fees will be sponsored by Quest@Stellar';
  }
  return 'Standard transaction fee applies';
}
