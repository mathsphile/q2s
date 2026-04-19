'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import {
  listQuests,
  getSubmissions,
  invalidateQuestCache,
  type OnChainSubmission,
  type SubmissionStatus,
} from '@/lib/quest-client';
import { formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MySubmission extends OnChainSubmission {
  quest_title: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusBadgeVariant: Record<SubmissionStatus, 'warning' | 'success' | 'error'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'error',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Ambassador — My Submissions (On-Chain via Soroban)
 *
 * Reads all quests and their submissions from the Quest contract,
 * then filters to show only submissions from the connected wallet.
 */
export default function AmbassadorSubmissionsPage() {
  const { address, connected, connect, connecting } = useWallet();
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!connected || !address) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Ensure we get fresh data
        invalidateQuestCache();
        // Get all quests, then fetch submissions for each
        const allQuests = await listQuests();
        const mySubs: MySubmission[] = [];

        const subPromises = allQuests.map(async (quest) => {
          const subs = await getSubmissions(quest.id);
          return subs
            .filter((s) => s.ambassador === address)
            .map((s) => ({
              ...s,
              quest_title: quest.title,
            }));
        });

        const results = await Promise.all(subPromises);
        for (const subs of results) {
          mySubs.push(...subs);
        }

        // Sort by submitted_at descending
        mySubs.sort((a, b) => b.submitted_at - a.submitted_at);

        if (!cancelled) setSubmissions(mySubs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load submissions from chain');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address, connected]);

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect your wallet to view your on-chain submissions
          </p>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-4">
              Connect your Stellar wallet to view your submissions.
            </p>
            <Button variant="primary" onClick={connect} loading={connecting}>
              Connect Wallet
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your on-chain submissions and their review status
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height="h-5" width="w-1/2" />
              <Skeleton height="h-4" width="w-1/4" className="mt-2" />
              <Skeleton height="h-16" width="w-full" className="mt-3" />
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card>
          <p className="text-center text-sm text-error py-8">{error}</p>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && submissions.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-foreground">No submissions yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Find a quest and submit your work to get started.
            </p>
          </div>
        </Card>
      )}

      {/* Submissions list */}
      {!loading && !error && submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const submittedStr = new Date(sub.submitted_at * 1000).toISOString();
            return (
              <Card key={`${sub.quest_id}-${sub.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{sub.quest_title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Submission #{sub.id} · Quest #{sub.quest_id} · {formatDate(submittedStr)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant[sub.status]}>{sub.status}</Badge>
                </div>

                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-foreground">{sub.content}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
