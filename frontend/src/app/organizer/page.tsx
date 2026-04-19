'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { listQuests, getSubmissions, type OnChainQuest } from '@/lib/quest-client';
import { formatNumber } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestState = 'Draft' | 'Active' | 'InReview' | 'Completed' | 'Cancelled';

const stateBadgeVariant: Record<QuestState, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  Draft: 'default',
  Active: 'success',
  InReview: 'warning',
  Completed: 'info',
  Cancelled: 'error',
};

const stateColors: Record<QuestState, string> = {
  Active: '#4f46e5',
  Completed: '#10b981',
  Draft: '#9ca3af',
  InReview: '#f59e0b',
  Cancelled: '#ef4444',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Organizer Dashboard — rich overview with on-chain data,
 * animated stats, donut chart, recent quests, and quick actions.
 *
 * Requirements: 18.1, 18.3
 */
export default function OrganizerOverviewPage() {
  const { address, connected } = useWallet();
  const [quests, setQuests] = useState<OnChainQuest[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !address) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const allQuests = await listQuests();
        const myQuests = allQuests.filter((q) => q.organizer === address);

        // Count pending submissions across all my quests
        let pending = 0;
        const subPromises = myQuests.map(async (quest) => {
          const subs = await getSubmissions(quest.id);
          for (const sub of subs) {
            if (sub.status === 'Pending') pending++;
          }
        });
        await Promise.all(subPromises);

        if (!cancelled) {
          setQuests(myQuests);
          setPendingSubmissions(pending);
        }
      } catch {
        // Show empty state on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address, connected]);

  // Compute stats from quests
  const questsByState: Record<string, number> = {};
  for (const q of quests) {
    questsByState[q.state] = (questsByState[q.state] ?? 0) + 1;
  }

  const totalFunded = quests.reduce((sum, q) => sum + Number(q.reward_amount), 0);
  const activeCount = questsByState['Active'] ?? 0;

  // Build donut chart segments
  const total = quests.length || 1;
  const segments: { state: QuestState; percent: number; color: string }[] = [];
  for (const state of ['Active', 'Completed', 'InReview', 'Draft', 'Cancelled'] as QuestState[]) {
    const count = questsByState[state] ?? 0;
    if (count > 0) {
      const percent = (count / total) * 100;
      segments.push({ state, percent, color: stateColors[state] });
    }
  }

  // Build conic-gradient string
  let gradientParts: string[] = [];
  let offset = 0;
  for (const seg of segments) {
    gradientParts.push(`${seg.color} ${offset}% ${offset + seg.percent}%`);
    offset += seg.percent;
  }
  if (gradientParts.length === 0) {
    gradientParts = ['#e5e7eb 0% 100%'];
  }
  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

  // Recent quests (last 5)
  const recentQuests = [...quests]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* ── Welcome Banner ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your quests, funding, and performance
        </p>
        <div className="gradient-line mt-3 max-w-xs" />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton height="h-4" width="w-24" />
              <Skeleton height="h-8" width="w-16" className="mt-2" />
            </Card>
          ))}
        </div>
      )}

      {/* Not connected state */}
      {!loading && !connected && (
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900">Connect your wallet</p>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Stellar wallet to view your on-chain quests.
            </p>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && connected && quests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900">No quests yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create your first quest to start engaging ambassadors.
            </p>
            <Link href="/organizer/quests/new">
              <Button variant="primary" className="mt-4">Create Quest</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Stats Row ── */}
      {!loading && quests.length > 0 && (
        <>
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">Quick Statistics</h2>
            <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Quests */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Total Quests</p>
                  <span className="text-lg" aria-hidden="true">📋</span>
                </div>
                <p className="animate-count mt-2 text-3xl font-bold text-gray-900">{quests.length}</p>
              </div>

              {/* Active Quests */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Active Quests</p>
                  <span className="text-lg" aria-hidden="true">🟢</span>
                </div>
                <p className="animate-count mt-2 text-3xl font-bold text-gray-900">{activeCount}</p>
              </div>

              {/* Total Funded */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Total Funded</p>
                  <span className="text-lg" aria-hidden="true">💰</span>
                </div>
                <p className="animate-count mt-2 text-3xl font-bold text-gray-900">
                  {formatNumber(totalFunded)}{' '}
                  <span className="text-base font-normal text-gray-400">XLM</span>
                </p>
              </div>

              {/* Pending Submissions */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-cyan-500">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Pending Submissions</p>
                  <span className="text-lg" aria-hidden="true">📨</span>
                </div>
                <p className="animate-count mt-2 text-3xl font-bold text-gray-900">{pendingSubmissions}</p>
              </div>
            </div>
          </section>

          {/* ── Quest Status Donut Chart ── */}
          <section aria-labelledby="chart-heading">
            <h2 id="chart-heading" className="mb-4 text-lg font-semibold text-gray-900">
              Quest Status
            </h2>
            <Card>
              <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                {/* Donut chart with spin-in animation */}
                <div className="relative animate-donut">
                  <div
                    className="h-36 w-36 rounded-full"
                    style={{ background: conicGradient }}
                    role="img"
                    aria-label="Quest status distribution chart"
                  />
                  {/* Inner white circle for donut effect */}
                  <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-white flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">{quests.length}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-2">
                  {(['Active', 'Completed', 'InReview', 'Draft', 'Cancelled'] as QuestState[]).map((state) => {
                    const count = questsByState[state] ?? 0;
                    if (count === 0) return null;
                    return (
                      <div key={state} className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: stateColors[state] }}
                          aria-hidden="true"
                        />
                        <span className="text-sm text-gray-600">{state}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </section>

          {/* ── Recent Quests ── */}
          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="mb-4 text-lg font-semibold text-gray-900">
              Recent Quests
            </h2>
            <Card>
              {recentQuests.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">No quests yet</p>
              ) : (
                <ul className="stagger-children divide-y divide-gray-100">
                  {recentQuests.map((quest) => (
                    <li key={quest.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant={stateBadgeVariant[quest.state]}>{quest.state}</Badge>
                        <span className="text-sm font-medium text-gray-900 truncate">{quest.title}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-sm text-gray-500">
                          {formatNumber(Number(quest.reward_amount))} XLM
                        </span>
                        <Link
                          href={`/organizer/quests`}
                          className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          View →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* ── Quick Actions ── */}
          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading" className="mb-4 text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
            <div className="stagger-children flex flex-wrap gap-3">
              <Link href="/organizer/quests/new">
                <Button variant="primary">Create Quest</Button>
              </Link>
              <Link href="/organizer/submissions">
                <Button variant="outline">Review Submissions</Button>
              </Link>
              <Link href="/organizer/quests">
                <Button variant="outline">My Quests</Button>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
