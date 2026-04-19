'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { listQuests, getSubmissions, type OnChainQuest, type OnChainSubmission } from '@/lib/quest-client';
import { formatNumber } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  activeQuests: number;
  mySubmissions: number;
  approvedCount: number;
  dailyCounts: number[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Ambassador Dashboard — rich overview with on-chain data,
 * animated stats, activity chart, and quick actions.
 */
export default function AmbassadorOverviewPage() {
  const { user } = useAuth();
  const { address, connected, connect, balance } = useWallet();
  const [data, setData] = useState<DashboardData | null>(null);
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
        let activeQuests = 0;
        let mySubmissions = 0;
        let approvedCount = 0;
        const dailyCounts = [0, 0, 0, 0, 0, 0, 0];

        // Count active quests
        for (const q of allQuests) {
          if (q.state === 'Active') activeQuests++;
        }

        // Fetch submissions for each quest
        const subPromises = allQuests.map(async (quest) => {
          const subs = await getSubmissions(quest.id);
          const mySubs = subs.filter((s) => s.ambassador === address);

          for (const sub of mySubs) {
            mySubmissions++;
            if (sub.status === 'Approved') approvedCount++;

            // Map submission to day of week for chart
            const date = new Date(sub.submitted_at * 1000);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
              const dayIndex = date.getDay();
              // Convert Sunday=0 to Monday-first: Mon=0..Sun=6
              const idx = dayIndex === 0 ? 6 : dayIndex - 1;
              dailyCounts[idx]++;
            }
          }
        });

        await Promise.all(subPromises);

        if (!cancelled) {
          setData({ activeQuests, mySubmissions, approvedCount, dailyCounts });
        }
      } catch {
        // Show empty state on error
        if (!cancelled) {
          setData({ activeQuests: 0, mySubmissions: 0, approvedCount: 0, dailyCounts: [0, 0, 0, 0, 0, 0, 0] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address, connected]);

  const xlmDisplay = balance ? parseFloat(balance).toFixed(2) : '0.00';
  const maxBar = data ? Math.max(...data.dailyCounts, 1) : 1;

  return (
    <div className="space-y-8">
      {/* ── Welcome Banner ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your quests, submissions, and earnings at a glance
        </p>
        <div className="gradient-line mt-3 max-w-xs" />
      </div>

      {/* Wallet connection prompt */}
      {!connected && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">Connect your wallet</p>
              <p className="text-sm text-gray-500">
                Link your Stellar wallet to view on-chain data and receive XLM rewards.
              </p>
            </div>
            <Button variant="primary" onClick={connect}>
              Connect Wallet
            </Button>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Quick Statistics</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton height="h-4" width="w-24" />
                <Skeleton height="h-8" width="w-16" className="mt-2" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Active Quests */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Active Quests</p>
                <span className="text-lg" aria-hidden="true">🎯</span>
              </div>
              <p className="animate-count mt-2 text-3xl font-bold text-gray-900">
                {data?.activeQuests ?? 0}
              </p>
            </div>

            {/* My Submissions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-cyan-500">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">My Submissions</p>
                <span className="text-lg" aria-hidden="true">📋</span>
              </div>
              <p className="animate-count mt-2 text-3xl font-bold text-gray-900">
                {data?.mySubmissions ?? 0}
              </p>
            </div>

            {/* XLM Balance */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">XLM Balance</p>
                <span className="text-lg" aria-hidden="true">💰</span>
              </div>
              <p className="animate-count mt-2 text-3xl font-bold text-gray-900">
                {xlmDisplay}{' '}
                <span className="text-base font-normal text-gray-400">XLM</span>
              </p>
            </div>

            {/* Approved */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <span className="text-lg" aria-hidden="true">✅</span>
              </div>
              <p className="animate-count mt-2 text-3xl font-bold text-gray-900">
                {data?.approvedCount ?? 0}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Activity Chart ── */}
      <section aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="mb-4 text-lg font-semibold text-gray-900">
          Weekly Activity
        </h2>
        <Card>
          <div className="flex items-end gap-3 h-44">
            {DAY_LABELS.map((label, i) => {
              const value = data?.dailyCounts[i] ?? 0;
              const heightPct = maxBar > 0 ? (value / maxBar) * 100 : 0;
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">{value}</span>
                  <div className="w-full rounded-t-md bg-gray-100" style={{ height: '100%', position: 'relative' }}>
                    <div
                      className="animate-bar absolute bottom-0 w-full rounded-t-md bg-indigo-500"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* ── Quick Actions ── */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="mb-4 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="stagger-children grid gap-4 sm:grid-cols-3">
          <Link href="/ambassador/quests" className="group">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-lg" aria-hidden="true">
                    🔍
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Explore Quests</p>
                    <p className="text-sm text-gray-500">Find new quests to complete</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link href="/ambassador/submissions" className="group">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-cyan-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-lg" aria-hidden="true">
                    📝
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">My Submissions</p>
                    <p className="text-sm text-gray-500">Track your submitted work</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link href="/ambassador/earnings" className="group">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-lg" aria-hidden="true">
                    💎
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Earnings</p>
                    <p className="text-sm text-gray-500">View your XLM rewards</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
