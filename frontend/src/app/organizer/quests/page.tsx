'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { listQuests, transitionState, type OnChainQuest, type QuestState } from '@/lib/quest-client';
import { formatNumber, formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stateBadgeVariant: Record<QuestState, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  Draft: 'default',
  Active: 'success',
  InReview: 'warning',
  Completed: 'info',
  Cancelled: 'error',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Organizer — Quest Management Page (On-Chain via Soroban)
 *
 * Reads quests from the Quest contract and bounty pool info from the Treasury
 * contract. State transitions and funding are done via Freighter-signed
 * Soroban transactions.
 */
export default function OrganizerQuestsPage() {
  const { address, connected, connect, connecting } = useWallet();
  const [quests, setQuests] = useState<OnChainQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionTarget, setActionTarget] = useState<OnChainQuest | null>(null);
  const [actionType, setActionType] = useState<'fund' | 'review' | 'cancel' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadQuests = async () => {
    setLoading(true);
    setError('');
    try {
      const allQuests = await listQuests();
      // Filter to only show quests created by the connected wallet
      const myQuests = address
        ? allQuests.filter((q) => q.organizer === address)
        : allQuests;
      setQuests(myQuests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests from chain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const openAction = (quest: OnChainQuest, action: 'fund' | 'review' | 'cancel') => {
    setActionTarget(quest);
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
      if (actionType === 'fund') {
        // Send XLM to escrow, then transition Draft → Active
        const { sendXlmPayment, ESCROW_ADDRESS } = await import('@/lib/soroban');
        if (ESCROW_ADDRESS) {
          await sendXlmPayment(address, ESCROW_ADDRESS, Number(actionTarget.reward_amount));
        }
        await transitionState(actionTarget.id, address, 'Active');
      } else if (actionType === 'review') {
        await transitionState(actionTarget.id, address, 'InReview');
      } else if (actionType === 'cancel') {
        await transitionState(actionTarget.id, address, 'Cancelled');
      }

      // Reload quests from chain
      await loadQuests();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setActionLoading(false);
      if (!actionError) closeAction();
    }
  };

  const actionLabels: Record<string, string> = {
    fund: 'Fund & Activate',
    review: 'Move to Review',
    cancel: 'Cancel Quest',
  };

  const actionDescriptions: Record<string, string> = {
    fund: `This will lock ${formatNumber(Number(actionTarget?.reward_amount ?? 0))} XLM in the bounty pool and activate the quest. Requires Freighter signing.`,
    review: `This will move "${actionTarget?.title}" to the InReview state. No new submissions will be accepted. Requires Freighter signing.`,
    cancel: `This will cancel "${actionTarget?.title}" and refund any remaining locked funds to your wallet. Requires Freighter signing.`,
  };

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Quests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect your wallet to manage your on-chain quests
          </p>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-4">
              Connect your Stellar wallet to view and manage your quests.
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Quests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your on-chain quests, funding, and state transitions
          </p>
        </div>
        <Link href="/organizer/quests/new">
          <Button variant="primary">Create Quest</Button>
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height="h-5" width="w-1/2" />
              <Skeleton height="h-4" width="w-1/3" className="mt-2" />
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <Skeleton height="h-12" />
                <Skeleton height="h-12" />
                <Skeleton height="h-12" />
                <Skeleton height="h-12" />
              </div>
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
      {!loading && !error && quests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-foreground">No quests yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first quest to start engaging ambassadors.
            </p>
            <Link href="/organizer/quests/new">
              <Button variant="primary" className="mt-4">
                Create Quest
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Quest list */}
      {!loading && !error && quests.length > 0 && (
        <div className="space-y-4">
          {quests.map((quest) => {
            const deadlineStr = new Date(quest.deadline * 1000).toISOString();
            return (
              <Card key={quest.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{quest.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      #{quest.id} · {quest.reward_type} · Max {quest.max_winners} winner
                      {quest.max_winners > 1 ? 's' : ''} · Deadline{' '}
                      {formatDate(deadlineStr)}
                    </p>
                  </div>
                  <Badge variant={stateBadgeVariant[quest.state]}>{quest.state}</Badge>
                </div>

                {/* Bounty pool details */}
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Reward</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatNumber(Number(quest.reward_amount))} XLM
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Total Funded</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatNumber(Number(quest.reward_amount ?? 0))} XLM
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Distributed</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatNumber(Number(0))} XLM
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Remaining</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatNumber(
                        Number(quest.reward_amount ?? 0),
                      )} XLM
                    </p>
                  </div>
                </div>

                {/* State transition controls */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {quest.state === 'Draft' && (
                    <Button size="sm" variant="primary" onClick={() => openAction(quest, 'fund')}>
                      Fund &amp; Activate
                    </Button>
                  )}
                  {quest.state === 'Active' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openAction(quest, 'review')}>
                        Move to Review
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAction(quest, 'cancel')}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {quest.state === 'InReview' && (
                    <Button size="sm" variant="outline" onClick={() => openAction(quest, 'cancel')}>
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action confirmation modal */}
      <Modal
        open={!!actionTarget && !!actionType}
        onClose={closeAction}
        title={actionType ? actionLabels[actionType] : ''}
      >
        <p className="text-sm text-gray-500">
          {actionType ? actionDescriptions[actionType] : ''}
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
            variant={actionType === 'cancel' ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleAction}
            loading={actionLoading}
          >
            {actionLoading ? 'Signing…' : 'Confirm'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
