'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar, { type UserRole } from './Sidebar';
import TopNav from './TopNav';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';

interface DashboardLayoutProps {
  role: UserRole;
  children: ReactNode;
}

export default function DashboardLayout({
  role,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { address, balance, connecting, error: walletError, connect, disconnect } = useWallet();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          userEmail={user?.email}
          walletAddress={address ?? user?.walletAddress}
          walletBalance={balance}
          walletConnecting={connecting}
          walletError={walletError}
          onConnectWallet={connect}
          onDisconnectWallet={disconnect}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
