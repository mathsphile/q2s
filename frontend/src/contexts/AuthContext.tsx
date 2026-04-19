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

/** User roles matching shared types */
type UserRole = 'admin' | 'organizer' | 'ambassador';

/** Authenticated user shape returned by the API */
interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  walletAddress?: string;
  isBanned: boolean;
  reputationScore: number;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextValue {
  /** Current authenticated user, or null when logged out */
  user: AuthUser | null;
  /** True while the initial session check is in progress */
  loading: boolean;
  /** Register a new account. Throws on failure. */
  register: (email: string, password: string, role: UserRole, extra?: Record<string, string>) => Promise<void>;
  /** Log in with email/password. Throws on failure. */
  login: (email: string, password: string) => Promise<void>;
  /** Log out and clear the session. */
  logout: () => Promise<void>;
  /** Refresh the current session token. Throws on failure. */
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'quest_stellar_token';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

/**
 * AuthProvider — manages JWT session state for the application.
 *
 * Stores the token in localStorage (suitable for SPA; httpOnly cookies
 * would require a BFF layer). On mount it checks for an existing token
 * and attempts to restore the session via /auth/refresh.
 *
 * Requirements: 2.1, 2.3, 3.5
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- helpers ----

  const saveToken = (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // SSR or storage full — silently ignore
    }
  };

  const clearToken = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  };

  const getToken = (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  };

  /** Generic fetch wrapper that attaches the JWT header. */
  const authedFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return fetch(`${API_BASE}${path}`, { ...init, headers });
    },
    [],
  );

  // ---- public API ----

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authedFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Login failed',
        );
      }

      const { token, user: loggedInUser } = (await res.json()) as {
        token: string;
        user: AuthUser;
      };
      saveToken(token);
      setUser(loggedInUser);
    },
    [authedFetch],
  );

  const register = useCallback(
    async (email: string, password: string, role: UserRole, extra?: Record<string, string>) => {
      const res = await authedFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role, ...extra }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Registration failed',
        );
      }

      // Backend register returns { user } without a token.
      // Automatically log in after successful registration to get a token.
      await login(email, password);
    },
    [authedFetch, login],
  );

  const logout = useCallback(async () => {
    try {
      await authedFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort — clear local state regardless
    }
    clearToken();
    setUser(null);
  }, [authedFetch]);

  const refreshToken = useCallback(async () => {
    const res = await authedFetch('/auth/refresh', { method: 'POST' });

    if (!res.ok) {
      // Token is no longer valid — force logout
      clearToken();
      setUser(null);
      throw new Error('Session expired');
    }

    const body = (await res.json()) as {
      token?: string;
      user?: AuthUser;
      refreshed?: boolean;
    };

    if (body.token) {
      saveToken(body.token);
    }
    if (body.user) {
      setUser(body.user);
    }
  }, [authedFetch]);

  // ---- session restore on mount ----

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Attempt to verify the existing token via /auth/refresh.
    // The refresh endpoint validates the JWT and returns user info
    // when the token is still valid.
    authedFetch('/auth/refresh', { method: 'POST' })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as {
            token?: string;
            user?: AuthUser;
            refreshed?: boolean;
          };
          if (body.token) {
            saveToken(body.token);
          }
          // If the refresh endpoint returned user info, use it.
          // Otherwise decode the JWT payload to restore user state.
          if (body.user) {
            setUser(body.user);
          } else {
            // Decode the JWT to get basic user info
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setUser({
                id: payload.userId,
                email: payload.email,
                role: payload.role,
                isBanned: false,
                reputationScore: 0,
                createdAt: '',
                updatedAt: '',
              });
            } catch {
              clearToken();
            }
          }
        } else {
          // Token invalid — clear it
          clearToken();
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authedFetch]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, register, login, logout, refreshToken }),
    [user, loading, register, login, logout, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context.
 *
 * Throws if used outside of `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
