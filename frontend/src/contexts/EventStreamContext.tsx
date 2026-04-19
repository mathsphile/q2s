'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StellarEvent {
  id: string;
  type: string;
  contractId: string;
  ledger: number;
  timestamp: number;
  data: Record<string, unknown>;
}

type EventHandler = (event: StellarEvent) => void;

interface EventStreamContextValue {
  /** Whether the WebSocket is currently connected */
  connected: boolean;
  /** Last connection error, if any */
  error: string | null;
  /** Subscribe to quest-specific events */
  subscribeToQuests: (questIds: number[]) => void;
  /** Unsubscribe from quest-specific events */
  unsubscribeFromQuests: (questIds: number[]) => void;
  /** Register a handler for incoming events */
  onEvent: (handler: EventHandler) => () => void;
  /** Most recent events (ring buffer) */
  recentEvents: StellarEvent[];
}

const EventStreamContext = createContext<EventStreamContextValue | undefined>(
  undefined,
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws/events';
const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECENT_EVENTS = 50;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * EventStreamProvider — React context wrapping a WebSocket connection
 * to the backend event streaming server.
 *
 * Implements automatic reconnection with exponential backoff and
 * dispatches real-time updates to registered handlers.
 *
 * Requirements: 19.5
 */
export function EventStreamProvider({
  children,
  role,
  userId,
}: {
  children: ReactNode;
  role?: string;
  userId?: string;
}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<StellarEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<EventHandler>>(new Set());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Connect ----

  const connect = useCallback(() => {
    // Build URL with auth params
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (userId) params.set('userId', userId);
    const url = `${WS_URL}?${params.toString()}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        console.log('[EventStream] Connected');
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            payload: unknown;
          };

          if (msg.type === 'event') {
            const stellarEvent = msg.payload as StellarEvent;

            // Add to recent events ring buffer
            setRecentEvents((prev) => {
              const next = [stellarEvent, ...prev];
              return next.slice(0, MAX_RECENT_EVENTS);
            });

            // Dispatch to handlers
            for (const handler of handlersRef.current) {
              try {
                handler(stellarEvent);
              } catch (err) {
                console.error('[EventStream] Handler error:', err);
              }
            }
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        ws.close();
      };
    } catch {
      setError('Failed to create WebSocket connection');
      scheduleReconnect();
    }
  }, [role, userId]);

  // ---- Reconnect with exponential backoff ----

  const scheduleReconnect = useCallback(() => {
    reconnectAttemptRef.current += 1;
    const backoff = Math.min(
      RECONNECT_INITIAL_MS *
        Math.pow(2, reconnectAttemptRef.current - 1),
      RECONNECT_MAX_MS,
    );

    console.log(
      `[EventStream] Reconnecting in ${backoff}ms (attempt ${reconnectAttemptRef.current})`,
    );

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, backoff);
  }, [connect]);

  // ---- Lifecycle ----

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // ---- Public API ----

  const subscribeToQuests = useCallback((questIds: number[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'subscribe', questIds }),
      );
    }
  }, []);

  const unsubscribeFromQuests = useCallback((questIds: number[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'unsubscribe', questIds }),
      );
    }
  }, []);

  const onEvent = useCallback((handler: EventHandler): (() => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const value = useMemo<EventStreamContextValue>(
    () => ({
      connected,
      error,
      subscribeToQuests,
      unsubscribeFromQuests,
      onEvent,
      recentEvents,
    }),
    [connected, error, subscribeToQuests, unsubscribeFromQuests, onEvent, recentEvents],
  );

  return (
    <EventStreamContext.Provider value={value}>
      {children}
    </EventStreamContext.Provider>
  );
}

/**
 * Hook to access the event stream context.
 *
 * Throws if used outside of `<EventStreamProvider>`.
 */
export function useEventStream(): EventStreamContextValue {
  const ctx = useContext(EventStreamContext);
  if (!ctx) {
    throw new Error('useEventStream must be used within an EventStreamProvider');
  }
  return ctx;
}
