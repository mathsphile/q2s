'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { WalletProvider } from '@/contexts/WalletContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { type ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <WalletProvider>
        <DashboardLayout role="admin">{children}</DashboardLayout>
      </WalletProvider>
    </AuthProvider>
  );
}
