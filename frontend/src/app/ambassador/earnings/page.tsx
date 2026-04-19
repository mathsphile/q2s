'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { listQuests, getSubmissions, type OnChainQuest, type OnChainSubmission } from '@/lib/quest-client';
import { getXlmBalance } from '@/lib/soroban';
import { formatNumber, formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EarningRecord {
  questId: number;
  questTitle: string;
  rewardAmount: number;
  submissionId: number;
  approvedAt: number;
}

function getReputationBadge(approved: number): { label: string; variant: 'success' | 'warning' | 'error' | 'info' } {
  if (approved >= 10) return { label: 'Expert', variant: 'success' };
  if (approved >= 5) return { label: 'Experienced', variant: 'info' };
  if (approved >= 1) return { label: 'Active', variant: 'warning' };
  return { label: 'New', variant: 'error' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AmbassadorEarningsPage() {
  const { address, connected, connect, connecting, balance } = useWallet();
  const [xlmBalance, setXlmBalance] = useState<number>(0);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !address) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Fetch XLM balance
        const bal = await getXlmBalance(address);
        if (!cancelled) setXlmBalance(bal);

        // Fetch all quests and find approved submissions for this ambassador
        const allQuests = await listQuests();
        const earningRecords: EarningRecord[] = [];
        let approved = 0;
        let pending = 0;
        let earned = 0;

        const subPromises = allQuests.map(async (quest) => {
          const subs = await getSubmissions(quest.id);
          const mySubs = subs.filter((s) => s.ambassador === address);

          for (const sub of mySubs) {
            if (sub.status === 'Approved') {
              approved++;
              const reward = quest.reward_type === 'Fixed'
                ? Number(quest.reward_amount)
                : Math.floor(Number(quest.reward_amount) / quest.max_winners);
              earned += reward;
              earningRecords.push({
                questId: quest.id,
                questTitle: quest.title,
                rewardAmount: reward,
                submissionId: sub.id,
                approvedAt: sub.submitted_at,
              });
            } else if (sub.status === 'Pending') {
              pending++;
            }
          }
        });

        await Promise.all(subPromises);

        if (!cancelled) {
          earningRecords.sort((a, b) => b.approvedAt - a.approvedAt);
          setEarnings(earningRecords);
          setTotalEarned(earned);
          setApprovedCount(approved);
          setPendingCount(pending);
        }
      } catch {
        // Show what we have
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address, connected]);

  const repBadge = getReputationBadge(approvedCount);

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Earnings &amp; Reputation</h1>
          <p className="mt-1 text-sm text-gray-500">Connect your wallet to view earnings</p>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-4">Connect your Stellar wallet to view your earnings.</p>
            <Button variant="primary" onClick={connect} loading={connecting}>Connect Wallet</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Earnings &amp; Reputation</h1>
        <p className="mt-1 text-sm text-gray-500">Track your XLM earnings and quest activity</p>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><Skeleton height="h-4" width="w-24" /><Skeleton height="h-8" width="w-20" className="mt-2" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">XLM Balance</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {xlmBalance.toFixed(2)} <span className="text-base font-normal text-gray-500">XLM</span>
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Total Earned</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {formatNumber(totalEarned)} <span className="text-base font-normal text-gray-500">XLM</span>
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Approved Quests</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{approvedCount}</p>
            <Badge variant={repBadge.variant} className="mt-2">{repBadge.label}</Badge>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{pendingCount}</p>
          </Card>
        </div>
      )}

      {/* Reputation */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Reputation</h2>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(approvedCount * 10, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground">{approvedCount} approved</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Your reputation grows with each approved submission. Complete more quests to level up.
          </p>
        </Card>
      </section>

      {/* Earning History */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Earning History</h2>
        {earnings.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No earnings yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Complete quests and get approved to start earning XLM.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Quest</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((record) => (
                  <tr key={`${record.questId}-${record.submissionId}`} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 text-foreground">{record.questTitle}</td>
                    <td className="py-3 pr-4 font-semibold text-accent-300">
                      +{formatNumber(record.rewardAmount)} XLM
                    </td>
                    <td className="py-3 text-gray-500">
                      {formatDate(new Date(record.approvedAt * 1000).toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Wallet Info */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Wallet</h2>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Connected Address</p>
              <p className="mt-1 font-mono text-sm text-foreground">{address}</p>
            </div>
            <a
              href={`https://stellar.expert/explorer/testnet/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View on Explorer →
            </a>
          </div>
        </Card>
      </section>
    </div>
  );
}
