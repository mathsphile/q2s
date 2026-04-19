'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useWallet } from '@/contexts/WalletContext';
import { createQuest, invalidateQuestCache } from '@/lib/quest-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RewardType = 'Fixed' | 'Split';

interface QuestFormData {
  title: string;
  description: string;
  acceptanceCriteria: string;
  rewardType: RewardType;
  rewardAmount: string;
  maxWinners: string;
  deadline: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Organizer — Quest Creation Form (On-Chain via Soroban)
 *
 * Builds a Soroban transaction to call the Quest contract's `create_quest`,
 * signs it with Freighter, and submits it to the network.
 */
export default function CreateQuestPage() {
  const router = useRouter();
  const { address, connected, connect, connecting } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof QuestFormData, string>>>({});
  const [txError, setTxError] = useState('');
  const [form, setForm] = useState<QuestFormData>({
    title: '',
    description: '',
    acceptanceCriteria: '',
    rewardType: 'Fixed',
    rewardAmount: '',
    maxWinners: '1',
    deadline: '',
  });

  const updateField = (field: keyof QuestFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setTxError('');
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof QuestFormData, string>> = {};

    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.acceptanceCriteria.trim())
      newErrors.acceptanceCriteria = 'Acceptance criteria is required';

    const amount = Number(form.rewardAmount);
    if (!form.rewardAmount || isNaN(amount) || amount <= 0)
      newErrors.rewardAmount = 'Reward amount must be greater than 0';

    const winners = Number(form.maxWinners);
    if (!form.maxWinners || isNaN(winners) || winners < 1)
      newErrors.maxWinners = 'Must have at least 1 winner';

    if (form.rewardType === 'Fixed' && winners !== 1)
      newErrors.maxWinners = 'Fixed reward type requires exactly 1 winner';

    if (!form.deadline) newErrors.deadline = 'Deadline is required';
    else if (new Date(form.deadline) <= new Date())
      newErrors.deadline = 'Deadline must be in the future';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!connected || !address) {
      setTxError('Please connect your Stellar wallet first.');
      return;
    }

    setSubmitting(true);
    setTxError('');
    try {
      const deadlineTimestamp = Math.floor(new Date(form.deadline).getTime() / 1000);

      await createQuest({
        organizer: address,
        title: form.title.trim(),
        description: form.description.trim(),
        acceptance_criteria: form.acceptanceCriteria.trim(),
        reward_type: form.rewardType,
        reward_amount: Number(form.rewardAmount),
        max_winners: Number(form.maxWinners),
        deadline: deadlineTimestamp,
      });

      invalidateQuestCache();
      setSubmitSuccess(true);
      setTimeout(() => {
        window.location.href = '/organizer/quests';
      }, 1500);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Quest</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define a new quest on-chain for ambassadors to complete
        </p>
      </div>

      {/* Wallet connection prompt */}
      {!connected && (
        <Card>
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-4">
              Connect your Stellar wallet to create a quest on-chain.
            </p>
            <Button variant="primary" onClick={connect} loading={connecting}>
              Connect Wallet
            </Button>
          </div>
        </Card>
      )}

      {connected && (
        <Card>
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">
              Connected wallet:{' '}
              <span className="font-mono text-foreground">
                {address?.slice(0, 8)}…{address?.slice(-8)}
              </span>
            </p>
          </div>

          {submitSuccess && (
            <div className="mb-4 rounded-lg border border-accent-400/30 bg-accent-400/10 px-4 py-3 text-sm text-accent-300">
              Quest created! Redirecting…
            </div>
          )}

          {txError && (
            <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {txError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Title"
              placeholder="Enter quest title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              error={errors.title}
            />

            {/* Description textarea */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe the quest in detail"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                aria-invalid={!!errors.description}
                className={`
                  w-full rounded-lg border bg-gray-50 px-3 py-2 text-foreground
                  placeholder:text-gray-500 transition-colors duration-200
                  focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                  ${errors.description ? 'border-error' : 'border-gray-200'}
                `}
              />
              {errors.description && (
                <p className="text-sm text-error" role="alert">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Acceptance criteria textarea */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="acceptanceCriteria" className="text-sm font-medium text-foreground">
                Acceptance Criteria
              </label>
              <textarea
                id="acceptanceCriteria"
                rows={3}
                placeholder="Define what constitutes a successful submission"
                value={form.acceptanceCriteria}
                onChange={(e) => updateField('acceptanceCriteria', e.target.value)}
                aria-invalid={!!errors.acceptanceCriteria}
                className={`
                  w-full rounded-lg border bg-gray-50 px-3 py-2 text-foreground
                  placeholder:text-gray-500 transition-colors duration-200
                  focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                  ${errors.acceptanceCriteria ? 'border-error' : 'border-gray-200'}
                `}
              />
              {errors.acceptanceCriteria && (
                <p className="text-sm text-error" role="alert">
                  {errors.acceptanceCriteria}
                </p>
              )}
            </div>

            {/* Reward type selector */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rewardType" className="text-sm font-medium text-foreground">
                Reward Type
              </label>
              <select
                id="rewardType"
                value={form.rewardType}
                onChange={(e) => {
                  const value = e.target.value as RewardType;
                  updateField('rewardType', value);
                  if (value === 'Fixed') updateField('maxWinners', '1');
                }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-foreground transition-colors duration-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Fixed">Fixed — single winner gets full reward</option>
                <option value="Split">Split — reward divided among winners</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Reward Amount (QUEST)"
                type="number"
                min="1"
                placeholder="e.g. 5000"
                value={form.rewardAmount}
                onChange={(e) => updateField('rewardAmount', e.target.value)}
                error={errors.rewardAmount}
              />

              <Input
                label="Max Winners"
                type="number"
                min="1"
                placeholder={form.rewardType === 'Fixed' ? '1' : 'e.g. 5'}
                value={form.maxWinners}
                onChange={(e) => updateField('maxWinners', e.target.value)}
                error={errors.maxWinners}
                disabled={form.rewardType === 'Fixed'}
              />
            </div>

            <Input
              label="Deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => updateField('deadline', e.target.value)}
              error={errors.deadline}
            />

            {/* Per-winner breakdown for Split */}
            {form.rewardType === 'Split' &&
              Number(form.rewardAmount) > 0 &&
              Number(form.maxWinners) > 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">
                    Each winner receives:{' '}
                    <span className="font-semibold text-foreground">
                      {Math.floor(
                        Number(form.rewardAmount) / Number(form.maxWinners),
                      ).toLocaleString()}{' '}
                      QUEST
                    </span>
                  </p>
                </div>
              )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/organizer/quests')}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {submitting ? 'Signing Transaction…' : 'Create Quest'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
