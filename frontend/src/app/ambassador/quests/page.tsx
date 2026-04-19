'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import { listQuests, type OnChainQuest, type RewardType } from '@/lib/quest-client';
import { formatNumber, formatDate, daysUntil } from '@/lib/format';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Ambassador — Quest Explorer (On-Chain via Soroban)
 *
 * Reads all quests from the Quest contract and filters for Active state.
 * Supports search and filter controls.
 */
export default function QuestExplorerPage() {
  const [quests, setQuests] = useState<OnChainQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [rewardFilter, setRewardFilter] = useState<'all' | 'Fixed' | 'Split'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'reward'>('deadline');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listQuests()
      .then((allQuests) => {
        if (cancelled) return;
        // Only show Active quests to ambassadors
        const activeQuests = allQuests.filter((q) => q.state === 'Active');
        setQuests(activeQuests);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load quests from chain');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = quests;

    // Search by keyword
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (quest) =>
          quest.title.toLowerCase().includes(q) ||
          quest.description?.toLowerCase().includes(q),
      );
    }

    // Filter by reward type
    if (rewardFilter !== 'all') {
      result = result.filter((quest) => quest.reward_type === rewardFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'deadline') {
        return a.deadline - b.deadline;
      }
      return Number(b.reward_amount) - Number(a.reward_amount);
    });

    return result;
  }, [quests, search, rewardFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Explore Quests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find active quests and start earning QUEST tokens
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Search"
              placeholder="Search by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rewardFilter" className="text-sm font-medium text-foreground">
              Reward Type
            </label>
            <select
              id="rewardFilter"
              value={rewardFilter}
              onChange={(e) => setRewardFilter(e.target.value as 'all' | 'Fixed' | 'Split')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-foreground transition-colors duration-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Types</option>
              <option value="Fixed">Fixed</option>
              <option value="Split">Split</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sortBy" className="text-sm font-medium text-foreground">
              Sort By
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'deadline' | 'reward')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-foreground transition-colors duration-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="deadline">Deadline (soonest)</option>
              <option value="reward">Reward (highest)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton height="h-5" width="w-3/4" />
              <Skeleton height="h-4" width="w-full" className="mt-3" />
              <Skeleton height="h-4" width="w-2/3" className="mt-1" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
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
            <p className="text-lg font-medium text-foreground">No active quests</p>
            <p className="mt-1 text-sm text-gray-500">
              Check back later for new quests to complete and earn QUEST tokens.
            </p>
          </div>
        </Card>
      )}

      {/* No filter results */}
      {!loading && !error && quests.length > 0 && filtered.length === 0 && (
        <Card>
          <p className="text-center text-sm text-gray-500 py-8">
            No quests match your search criteria.
          </p>
        </Card>
      )}

      {/* Quest list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((quest) => {
            const deadlineStr = new Date(quest.deadline * 1000).toISOString();
            const days = daysUntil(deadlineStr);
            return (
              <Card key={quest.id} hover>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{quest.title}</h3>
                  <Badge variant={quest.reward_type === 'Fixed' ? 'info' : 'warning'}>
                    {quest.reward_type}
                  </Badge>
                </div>

                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {quest.description}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {formatNumber(Number(quest.reward_amount))}
                    </p>
                    <p className="text-xs text-gray-500">QUEST Reward</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{days}</p>
                    <p className="text-xs text-gray-500">Days Left</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {quest.max_winners}
                    </p>
                    <p className="text-xs text-gray-500">Max Winners</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Deadline: {formatDate(deadlineStr)}
                    {quest.reward_type === 'Split' &&
                      ` · ${quest.max_winners} winners`}
                  </span>
                  <Link href={`/ambassador/quests/${quest.id}`}>
                    <Button size="sm" variant="primary">
                      View Quest
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
