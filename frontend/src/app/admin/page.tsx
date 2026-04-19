'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { apiFetch } from '@/lib/api';
import { listQuests, type OnChainQuest, type QuestState } from '@/lib/quest-client';
import { formatNumber, formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRecord {
  id: string;
  email: string;
  role: string;
  wallet_address: string | null;
  is_banned: boolean;
  reputation_score: number;
  created_at: string;
}

const stateColors: Record<string, string> = {
  Active: '#4f46e5',
  Completed: '#10b981',
  Draft: '#9ca3af',
  InReview: '#f59e0b',
  Cancelled: '#ef4444',
};

const stateBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  Draft: 'default',
  Active: 'success',
  InReview: 'warning',
  Completed: 'info',
  Cancelled: 'error',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [quests, setQuests] = useState<OnChainQuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [usersRes, questsRes] = await Promise.allSettled([
          apiFetch<{ users: UserRecord[] }>('/admin/users'),
          listQuests(),
        ]);

        if (cancelled) return;

        if (usersRes.status === 'fulfilled') {
          const list = Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.users ?? [];
          setUsers(list);
        }
        if (questsRes.status === 'fulfilled') {
          setQuests(questsRes.value);
        }
      } catch {
        // Show what we have
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Compute stats
  const usersByRole: Record<string, number> = {};
  for (const u of users) {
    usersByRole[u.role] = (usersByRole[u.role] ?? 0) + 1;
  }

  const questsByState: Record<string, number> = {};
  for (const q of quests) {
    questsByState[q.state] = (questsByState[q.state] ?? 0) + 1;
  }

  const totalReward = quests.reduce((sum, q) => sum + Number(q.reward_amount), 0);
  const recentUsers = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  // Donut chart
  const totalQuests = quests.length || 1;
  let offset = 0;
  const gradientParts: string[] = [];
  for (const state of ['Active', 'Completed', 'InReview', 'Draft', 'Cancelled']) {
    const count = questsByState[state] ?? 0;
    if (count > 0) {
      const pct = (count / totalQuests) * 100;
      gradientParts.push(`${stateColors[state]} ${offset}% ${offset + pct}%`);
      offset += pct;
    }
  }
  if (gradientParts.length === 0) gradientParts.push('#e5e7eb 0% 100%');
  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Platform overview</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><Skeleton height="h-4" width="w-24" /><Skeleton height="h-8" width="w-16" className="mt-2" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Platform-wide statistics and management</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hover>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <span className="text-lg">👥</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{users.length}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(usersByRole).map(([role, count]) => (
              <Badge key={role} variant={role === 'admin' ? 'info' : role === 'organizer' ? 'warning' : 'success'}>
                {role}: {count}
              </Badge>
            ))}
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">On-Chain Quests</p>
            <span className="text-lg">📋</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{quests.length}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(questsByState).map(([state, count]) => (
              <Badge key={state} variant={stateBadgeVariant[state] ?? 'default'}>
                {state}: {count}
              </Badge>
            ))}
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Bounties</p>
            <span className="text-lg">💰</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatNumber(totalReward)} <span className="text-base font-normal text-gray-400">XLM</span>
          </p>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active Quests</p>
            <span className="text-lg">🟢</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{questsByState['Active'] ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Quest Status Chart */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quest Distribution</h2>
          <Card>
            {quests.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No quests on-chain yet</p>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <div className="relative">
                  <div className="h-36 w-36 rounded-full" style={{ background: conicGradient }} />
                  <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-white flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">{quests.length}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {(['Active', 'Completed', 'InReview', 'Draft', 'Cancelled'] as string[]).map((state) => {
                    const count = questsByState[state] ?? 0;
                    if (count === 0) return null;
                    return (
                      <div key={state} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stateColors[state] }} />
                        <span className="text-sm text-gray-600">{state}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Recent Users */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link href="/admin/users"><Button variant="outline" size="sm">View All</Button></Link>
          </div>
          <Card>
            {recentUsers.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No users yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-400">{formatDate(u.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === 'organizer' ? 'warning' : u.role === 'admin' ? 'info' : 'success'}>
                        {u.role}
                      </Badge>
                      {u.is_banned && <Badge variant="error">Banned</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users"><Button variant="primary">Manage Users</Button></Link>
          <Link href="/admin/quests"><Button variant="outline">Moderate Quests</Button></Link>
          <Link href="/admin/disputes"><Button variant="outline">Review Disputes</Button></Link>
        </div>
      </section>
    </div>
  );
}
