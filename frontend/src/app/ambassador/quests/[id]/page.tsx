'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { getQuest, submitWork, getSubmissions, invalidateQuestCache, type OnChainQuest } from '@/lib/quest-client';
import { formatNumber, formatDate, daysUntil } from '@/lib/format';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Quest Detail Page (On-Chain via Soroban)
 *
 * Reads quest details from the Quest contract. Submission requires
 * a connected Freighter wallet for signing.
 */
export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = Number(params.id);
  const { address, connected, connect, connecting } = useWallet();

  const [quest, setQuest] = useState<OnChainQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submission form state
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQuest(questId)
      .then((q) => {
        if (cancelled) return;
        setQuest(q);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load quest');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [questId]);

  // Check if the connected wallet already has a pending submission for this quest
  useEffect(() => {
    if (!connected || !address) return;
    let cancelled = false;

    getSubmissions(questId).then((subs) => {
      if (cancelled) return;
      const existing = subs.find(
        (s) => s.ambassador === address && s.status === 'Pending',
      );
      if (existing) setHasSubmitted(true);
    }).catch(() => { /* ignore — non-critical */ });

    return () => { cancelled = true; };
  }, [questId, address, connected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!connected || !address) {
      setSubmitError('Please connect your Stellar wallet to submit work.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await submitWork(questId, address, content.trim());
      invalidateQuestCache();
      setSubmitSuccess(true);
      setHasSubmitted(true);
      setContent('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="h-8" width="w-1/2" />
        <Card>
          <Skeleton height="h-5" width="w-full" />
          <Skeleton height="h-5" width="w-3/4" className="mt-2" />
          <Skeleton height="h-5" width="w-2/3" className="mt-2" />
          <div className="mt-6 grid grid-cols-4 gap-4">
            <Skeleton height="h-16" />
            <Skeleton height="h-16" />
            <Skeleton height="h-16" />
            <Skeleton height="h-16" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-error">{error || 'Quest not found'}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/ambassador/quests')}
            >
              Back to Quests
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const deadlineStr = new Date(quest.deadline * 1000).toISOString();
  const days = daysUntil(deadlineStr);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/ambassador/quests')}
        className="text-sm text-gray-500 hover:text-foreground transition-colors"
      >
        ← Back to Quests
      </button>

      {/* Quest header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quest.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quest #{quest.id} · Organizer: {quest.organizer.slice(0, 8)}…{quest.organizer.slice(-8)}
          </p>
        </div>
        <Badge variant={quest.reward_type === 'Fixed' ? 'info' : 'warning'}>
          {quest.reward_type}
        </Badge>
      </div>

      {/* Quest details */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground">Description</h2>
        <p className="mt-2 text-sm text-gray-500 whitespace-pre-wrap">
          {quest.description}
        </p>

        {quest.acceptance_criteria && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-foreground">
              Acceptance Criteria
            </h2>
            <p className="mt-2 text-sm text-gray-500 whitespace-pre-wrap">
              {quest.acceptance_criteria}
            </p>
          </>
        )}
      </Card>

      {/* Reward info */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-gray-500">Reward</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatNumber(Number(quest.reward_amount))} QUEST
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-500">Max Winners</p>
          <p className="mt-1 text-xl font-bold text-foreground">{quest.max_winners}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-500">Deadline</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatDate(deadlineStr)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-500">Days Left</p>
          <p className="mt-1 text-xl font-bold text-foreground">{days}</p>
        </Card>
      </div>

      {/* Submit work form */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground">Submit Work</h2>

        {!connected && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-3">
              Connect your Stellar wallet to submit work on-chain.
            </p>
            <Button variant="primary" onClick={connect} loading={connecting}>
              Connect Wallet
            </Button>
          </div>
        )}

        {connected && (
          <>
            {(hasSubmitted || submitSuccess) && (
              <div className="mt-4 rounded-lg border border-accent-400/30 bg-accent-400/10 px-4 py-3 text-sm text-accent-300">
                Your submission is pending review.
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {submitError}
              </div>
            )}

            {!hasSubmitted && !submitSuccess && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="submissionContent" className="text-sm font-medium text-foreground">
                    Submission Content
                  </label>
                  <textarea
                    id="submissionContent"
                    rows={5}
                    placeholder="Describe your work and provide links or deliverables..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-foreground placeholder:text-gray-500 transition-colors duration-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={submitting} disabled={!content.trim()}>
                    {submitting ? 'Signing Transaction…' : 'Submit'}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
