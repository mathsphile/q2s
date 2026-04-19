'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isConnected as freighterIsConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
} from '@stellar/freighter-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletContextValue {
  address: string | null;
  balance: string | null;
  connecting: boolean;
  connected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string | null>;
  requireWallet: () => boolean;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/';
const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const WALLET_STORAGE_KEY = 'quest_stellar_wallet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchXlmBalance(addr: string): Promise<string> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${addr}`);
    if (!res.ok) {
      if (res.status === 404) return '0';
      throw new Error('Failed to fetch balance');
    }
    const data = (await res.json()) as {
      balances: Array<{ asset_type: string; balance: string }>;
    };
    const native = data.balances.find((b) => b.asset_type === 'native');
    return native?.balance ?? '0';
  } catch {
    return '0';
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = address !== null;

  const getBalanceFn = useCallback(async (): Promise<string | null> => {
    if (!address) return null;
    const bal = await fetchXlmBalance(address);
    setBalance(bal);
    return bal;
  }, [address]);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);

    try {
      // Check if Freighter extension is installed
      const connectionResult = await freighterIsConnected();
      const isInstalled = connectionResult.isConnected;

      if (!isInstalled) {
        setError(
          `Freighter wallet not detected. Install it from ${FREIGHTER_INSTALL_URL}`,
        );
        setConnecting(false);
        return;
      }

      // Check if we already have permission, if not request it
      const allowedResult = await isAllowed();
      if (!allowedResult.isAllowed) {
        const accessResult = await requestAccess();
        if (accessResult.error) {
          setError(accessResult.error);
          setConnecting(false);
          return;
        }
      }

      // Get the public key
      const addressResult = await getAddress();
      if (addressResult.error) {
        setError(addressResult.error);
        setConnecting(false);
        return;
      }

      const pubKey = addressResult.address;
      setAddress(pubKey);

      // Persist to localStorage so we can silently reconnect on refresh
      try { localStorage.setItem(WALLET_STORAGE_KEY, pubKey); } catch { /* SSR / private mode */ }

      // Log the network for debugging
      const networkResult = await getNetwork();
      console.log('[Wallet] Connected on network:', networkResult.network);

      // Fetch balance
      const bal = await fetchXlmBalance(pubKey);
      setBalance(bal);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Wallet connection failed';
      setError(message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setError(null);
    try { localStorage.removeItem(WALLET_STORAGE_KEY); } catch { /* SSR / private mode */ }
  }, []);

  // Auto-reconnect on mount if a wallet address was previously saved
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = localStorage.getItem(WALLET_STORAGE_KEY);
        if (!saved) return;

        // Verify Freighter is still installed and connected
        const connectionResult = await freighterIsConnected();
        if (!connectionResult.isConnected) return;

        // Verify we still have permission (don't show popup)
        const allowedResult = await isAllowed();
        if (!allowedResult.isAllowed) return;

        // Verify the address matches what we saved
        const addressResult = await getAddress();
        if (addressResult.error || addressResult.address !== saved) {
          // Address changed or error — clear stale data
          localStorage.removeItem(WALLET_STORAGE_KEY);
          return;
        }

        if (cancelled) return;

        setAddress(saved);
        const bal = await fetchXlmBalance(saved);
        if (!cancelled) setBalance(bal);
      } catch {
        // Silent failure — user can manually reconnect
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const requireWallet = useCallback((): boolean => {
    if (connected) return true;
    setError('Please connect your Stellar wallet to perform this transaction.');
    return false;
  }, [connected]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      balance,
      connecting,
      connected,
      error,
      connect,
      disconnect,
      getBalance: getBalanceFn,
      requireWallet,
    }),
    [address, balance, connecting, connected, error, connect, disconnect, getBalanceFn, requireWallet],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}
