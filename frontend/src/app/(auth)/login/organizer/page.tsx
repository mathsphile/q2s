'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

export default function OrganizerLoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace(user.role === 'organizer' ? '/organizer' : `/${user.role}`);
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-[#fafafa] bg-grid">
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center mb-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-3xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Organizer Sign In</h1>
          <p className="mt-2 text-center text-gray-500">Manage your quests and bounties</p>

          {error && (
            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-2 w-full">
              Sign In as Organizer
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/login" className="text-gray-500 hover:text-gray-700 transition-colors">← Back</Link>
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
