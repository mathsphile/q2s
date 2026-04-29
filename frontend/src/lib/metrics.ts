/**
 * Platform metrics collection — aggregates on-chain and off-chain data
 * for the admin metrics dashboard.
 */

import { listQuests, getSubmissions, type OnChainQuest } from './quest-client';

export interface PlatformMetrics {
  totalQuests: number;
  activeQuests: number;
  completedQuests: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  pendingSubmissions: number;
  uniqueOrganizers: number;
  uniqueAmbassadors: number;
  totalRewardXlm: number;
}

/**
 * Collect platform-wide metrics from on-chain data.
 */
export async function collectMetrics(): Promise<PlatformMetrics> {
  const quests = await listQuests();

  const organizers = new Set<string>();
  const ambassadors = new Set<string>();
  let totalSubs = 0;
  let approved = 0;
  let rejected = 0;
  let pending = 0;

  for (const quest of quests) {
    organizers.add(quest.organizer);
    const subs = await getSubmissions(quest.id);
    for (const sub of subs) {
      totalSubs++;
      ambassadors.add(sub.ambassador);
      if (sub.status === 'Approved') approved++;
      else if (sub.status === 'Rejected') rejected++;
      else pending++;
    }
  }

  return {
    totalQuests: quests.length,
    activeQuests: quests.filter(q => q.state === 'Active').length,
    completedQuests: quests.filter(q => q.state === 'Completed').length,
    totalSubmissions: totalSubs,
    approvedSubmissions: approved,
    rejectedSubmissions: rejected,
    pendingSubmissions: pending,
    uniqueOrganizers: organizers.size,
    uniqueAmbassadors: ambassadors.size,
    totalRewardXlm: quests.reduce((sum, q) => sum + Number(q.reward_amount), 0),
  };
}
