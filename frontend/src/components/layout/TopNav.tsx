'use client';

import Button from '@/components/ui/Button';

interface TopNavProps {
  onMenuToggle: () => void;
  userEmail?: string;
  walletAddress?: string;
  walletBalance?: string | null;
  walletConnecting?: boolean;
  walletError?: string | null;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
  onLogout?: () => void;
}

export default function TopNav({
  onMenuToggle,
  userEmail,
  walletAddress,
  walletBalance,
  walletConnecting,
  walletError,
  onConnectWallet,
  onDisconnectWallet,
  onLogout,
}: TopNavProps) {
  const truncatedWallet = walletAddress
    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4">
      {/* Hamburger — visible below md */}
      <button
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        className="tap-target rounded-lg p-2 text-gray-400 hover:text-gray-900 md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Wallet status / connect button */}
      {truncatedWallet ? (
        <div className="hidden sm:flex items-center gap-2">
          {walletBalance && (
            <span className="text-xs text-gray-500">
              {parseFloat(walletBalance).toFixed(2)} XLM
            </span>
          )}
          <button
            onClick={onDisconnectWallet}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            title="Click to disconnect wallet"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {truncatedWallet}
          </button>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-2">
          {walletError && (
            <span className="text-xs text-red-500 max-w-[200px] truncate" title={walletError}>
              {walletError.includes('Install') || walletError.includes('install') ? (
                <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="underline">
                  Install Freighter
                </a>
              ) : (
                walletError
              )}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onConnectWallet}
            loading={walletConnecting}
          >
            Connect Wallet
          </Button>
        </div>
      )}

      {/* User info */}
      {userEmail && (
        <span className="truncate max-w-[160px] text-sm text-gray-500">
          {userEmail}
        </span>
      )}

      {/* Logout button */}
      {userEmail && onLogout && (
        <button
          onClick={onLogout}
          className="rounded-lg p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      )}
    </header>
  );
}
