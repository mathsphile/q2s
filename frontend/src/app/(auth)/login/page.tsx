'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin',
  organizer: '/organizer',
  ambassador: '/ambassador',
};

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(ROLE_DASHBOARDS[user.role] ?? '/');
    }
  }, [user, router]);

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-[#fafafa] bg-grid">
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Sign In</h1>
          <p className="mt-2 text-center text-gray-500">Choose how you want to sign in</p>

          <div className="mt-8 flex flex-col gap-4">
            <Link
              href="/login/organizer"
              className="flex items-center gap-4 rounded-xl border border-gray-200 p-5 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-2xl">🎯</span>
              <div>
                <p className="font-semibold text-gray-900">Organizer</p>
                <p className="text-sm text-gray-500">Create quests and manage bounties</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/login/ambassador"
              className="flex items-center gap-4 rounded-xl border border-gray-200 p-5 transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-2xl">🚀</span>
              <div>
                <p className="font-semibold text-gray-900">Ambassador</p>
                <p className="text-sm text-gray-500">Complete quests and earn XLM</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
