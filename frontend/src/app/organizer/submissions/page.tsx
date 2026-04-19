'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import {
  listQuests,
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  invalidateQuestCache,
  type OnChainQuest,
  type OnChainSubmission,
  type SubmissionStatus,
} from '@/lib/quest-client';
import { formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubmissionWithQuest extends OnChainSubmission {
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
 * Organizer — Submission Review Panel (On-Chain via Soroban)
 *
 * Reads quests and their submissions from the Quest contract.
 * Approve/reject actions are Freighter-signed Soroban transactions.
 */
export default function OrganizerSubmissionsPage() {
  const { address, connected, connect, connecting } = useWallet();
  const [submissions, setSubmissions] = useState<SubmissionWithQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionTarget, setActionTarget] = useState<SubmissionWithQuest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [quests, setQuests] = useState<OnChainQuest[]>([]);

  const loadSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      // Get all quests, filter to organizer's quests
      const allQuests = await listQuests();
      const myQuests = address
        ? allQuests.filter((q) => q.organizer === address)
        : allQuests;
      setQuests(myQuests);

      // Fetch submissions for each quest
      const allSubs: SubmissionWithQuest[] = [];
      const subPromises = myQuests.map(async (quest) => {
        const subs = await getSubmissions(quest.id);
        return subs.map((s) => ({
          ...s,
          quest_title: quest.title,
        }));
      });

      const results = await Promise.all(subPromises);
      for (const subs of results) {
        allSubs.push(...subs);
      }

      // Sort by submitted_at descending
      allSubs.sort((a, b) => b.submitted_at - a.submitted_at);
      setSubmissions(allSubs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions from chain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) {
      loadSubmissions();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, connected]);

  const openAction = (sub: SubmissionWithQuest, action: 'approve' | 'reject') => {
    setActionTarget(sub);
    setActionType(action);
    setActionError('');
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionType(null);
    setActionError('');
  };

  const handleAction = async () => {
    if (!actionTarget || !actionType || !address) return;

    setActionLoading(true);
    setActionError('');
    try {
      if (actionType === 'approve') {
        // Step 1: Approve on-chain (updates submission status in Quest contract)
        await approveSubmission(actionTarget.quest_id, actionTarget.id, address);

        // Step 2: Send XLM reward to ambassador
        const quest = quests.find((q) => q.id === actionTarget.quest_id);
        if (quest) {
          try {
            const { sendXlmPayment } = await import('@/lib/soroban');
            const rewardXlm = quest.reward_type === 'Fixed'
              ? Number(quest.reward_amount)
              : Math.floor(Number(quest.reward_amount) / quest.max_winners);
            
            if (rewardXlm > 0) {
              await sendXlmPayment(address, actionTarget.ambassador, rewardXlm);
            }
          } catch (payErr) {
            // On-chain approval succeeded but XLM payment failed
            // Show error but don't block — the approval is already recorded
            const msg = payErr instanceof Error ? payErr.message : 'XLM payment failed';
            setActionError(`Submission approved on-chain, but XLM payment failed: ${msg}. You can send the payment manually.`);
            invalidateQuestCache();
            await loadSubmissions();
            setActionLoading(false);
            return;
          }
        }
      } else {
        await rejectSubmission(actionTarget.quest_id, actionTarget.id, address);
      }

      // Reload submissions from chain
      invalidateQuestCache();
      await loadSubmissions();
      closeAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submission Review</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect your wallet to review submissions
          </p>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-4">
              Connect your Stellar wallet to view and review submissions.
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
        <h1 className="text-2xl font-bold text-foreground">Submission Review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve or reject ambassador submissions on-chain
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height="h-5" width="w-1/2" />
              <Skeleton height="h-4" width="w-1/3" className="mt-2" />
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
              Submissions from ambassadors will appear here for review.
            </p>
          </div>
        </Card>
      )}

      {/* Submission cards */}
      {!loading && !error && submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const submittedStr = new Date(sub.submitted_at * 1000).toISOString();
            return (
              <Card key={`${sub.quest_id}-${sub.id}`}>
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{sub.quest_title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Quest #{sub.quest_id} · Submission #{sub.id} ·{' '}
                      {formatDate(submittedStr)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant[sub.status]}>{sub.status}</Badge>
                </div>

                {/* Ambassador address */}
                <div className="mt-3 text-xs text-gray-500">
                  <span>Ambassador: </span>
                  <span className="font-mono">
                    {sub.ambassador.slice(0, 8)}…{sub.ambassador.slice(-8)}
                  </span>
                </div>

                {/* Submission content */}
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-foreground">{sub.content}</p>
                </div>

                {/* Actions */}
                {sub.status === 'Pending' && (
                  <div className="mt-4 flex justify-end gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAction(sub, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openAction(sub, 'approve')}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Action confirmation modal */}
      <Modal
        open={!!actionTarget && !!actionType}
        onClose={closeAction}
        title={actionType === 'approve' ? 'Approve Submission' : 'Reject Submission'}
      >
        <p className="text-sm text-gray-500">
          {actionType === 'approve'
            ? (() => {
                const quest = quests.find((q) => q.id === actionTarget?.quest_id);
                const rewardXlm = quest
                  ? quest.reward_type === 'Fixed'
                    ? Number(quest.reward_amount)
                    : Math.floor(Number(quest.reward_amount) / quest.max_winners)
                  : 0;
                return `Approving will: 1) Update status on-chain (Freighter sign #1), 2) Send ${rewardXlm} XLM to the ambassador (Freighter sign #2).`;
              })()
            : `Rejecting this submission will allow the ambassador to resubmit. Requires Freighter signing.`}
        </p>
        {actionError && (
          <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {actionError}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={closeAction}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'approve' ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleAction}
            loading={actionLoading}
          >
            {actionLoading ? 'Signing…' : actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
