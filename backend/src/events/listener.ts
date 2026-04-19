/**
 * Event Stream Listener
 *
 * Connects to Soroban RPC and subscribes to Quest, Treasury, Token, and
 * Liquidity Pool contract events. Parses contract events and transforms
 * them to application event format. Implements automatic reconnection
 * with exponential backoff and event resynchronization from last known
 * ledger on reconnect.
 *
 * Requirements: 19.1–19.5
 */

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

export interface EventStreamConfig {
  rpcUrl: string;
  contractIds: {
    quest: string;
    treasury: string;
    token: string;
    liquidityPool: string;
  };
  /** Starting ledger for initial sync. Defaults to latest. */
  startLedger?: number;
}

type EventHandler = (event: StellarEvent) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
const BACKOFF_MULTIPLIER = 2;
const POLL_INTERVAL_MS = 5_000;

// ---------------------------------------------------------------------------
// EventStreamListener
// ---------------------------------------------------------------------------

export class EventStreamListener {
  private config: EventStreamConfig;
  private handlers: EventHandler[] = [];
  private lastLedger = 0;
  private running = false;
  private reconnectAttempts = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: EventStreamConfig) {
    this.config = config;
    if (config.startLedger) {
      this.lastLedger = config.startLedger;
    }
  }

  /** Register an event handler. */
  onEvent(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  /** Start listening for events. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.reconnectAttempts = 0;

    console.log('[EventStreamListener] Starting event listener...');
    await this.poll();
  }

  /** Stop listening for events. */
  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[EventStreamListener] Stopped.');
  }

  /** Resynchronize events from a specific ledger. */
  async resync(fromLedger: number): Promise<StellarEvent[]> {
    console.log(`[EventStreamListener] Resyncing from ledger ${fromLedger}...`);
    const events = await this.fetchEvents(fromLedger);
    return events;
  }

  // ---- Private methods ----

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const events = await this.fetchEvents(this.lastLedger);

      for (const event of events) {
        this.lastLedger = Math.max(this.lastLedger, event.ledger);
        this.emit(event);
      }

      // Reset backoff on successful poll
      this.reconnectAttempts = 0;

      // Schedule next poll
      this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
    } catch (error) {
      console.error('[EventStreamListener] Poll error:', error);
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (!this.running) return;

    this.reconnectAttempts += 1;
    const backoff = Math.min(
      INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, this.reconnectAttempts - 1),
      MAX_BACKOFF_MS,
    );

    console.log(
      `[EventStreamListener] Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts})...`,
    );

    this.pollTimer = setTimeout(() => this.poll(), backoff);
  }

  /**
   * Fetch events from Soroban RPC.
   *
   * TODO: Replace with actual Soroban RPC `getEvents` call.
   * The real implementation would use:
   *   POST {rpcUrl} with method "getEvents" and filters for each contract.
   */
  private async fetchEvents(fromLedger: number): Promise<StellarEvent[]> {
    // Placeholder — in production this calls the Soroban RPC getEvents endpoint
    const contractIds = Object.values(this.config.contractIds);

    // Simulated RPC call structure for reference:
    // const response = await fetch(this.config.rpcUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     jsonrpc: '2.0',
    //     id: 1,
    //     method: 'getEvents',
    //     params: {
    //       startLedger: fromLedger,
    //       filters: contractIds.map((id) => ({
    //         type: 'contract',
    //         contractIds: [id],
    //       })),
    //     },
    //   }),
    // });

    void contractIds;
    void fromLedger;

    return [];
  }

  /** Parse a raw Soroban event into our application format. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseEvent(rawEvent: any): StellarEvent {
    return {
      id: rawEvent?.id ?? '',
      type: this.inferEventType(rawEvent),
      contractId: rawEvent?.contractId ?? '',
      ledger: rawEvent?.ledger ?? 0,
      timestamp: Date.now(),
      data: rawEvent?.value ?? {},
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inferEventType(rawEvent: any): string {
    const topic = rawEvent?.topic?.[0] ?? '';
    const contractId: string = rawEvent?.contractId ?? '';

    // Map contract IDs to event type prefixes
    if (contractId === this.config.contractIds.quest) {
      if (typeof topic === 'string' && topic.includes('submit')) return 'quest:submission';
      if (typeof topic === 'string' && topic.includes('state')) return 'quest:state_change';
      return 'quest:event';
    }
    if (contractId === this.config.contractIds.treasury) {
      if (typeof topic === 'string' && topic.includes('reward')) return 'treasury:reward';
      if (typeof topic === 'string' && topic.includes('fund')) return 'treasury:fund';
      if (typeof topic === 'string' && topic.includes('refund')) return 'treasury:refund';
      return 'treasury:event';
    }
    if (contractId === this.config.contractIds.token) {
      return 'token:event';
    }
    if (contractId === this.config.contractIds.liquidityPool) {
      if (typeof topic === 'string' && topic.includes('swap')) return 'pool:swap';
      return 'pool:event';
    }

    return 'unknown';
  }

  private emit(event: StellarEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[EventStreamListener] Handler error:', err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and configure an EventStreamListener from environment variables.
 */
export function createEventStreamListener(): EventStreamListener {
  const config: EventStreamConfig = {
    rpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    contractIds: {
      quest: process.env.QUEST_CONTRACT_ID ?? '',
      treasury: process.env.TREASURY_CONTRACT_ID ?? '',
      token: process.env.TOKEN_CONTRACT_ID ?? '',
      liquidityPool: process.env.LP_CONTRACT_ID ?? '',
    },
  };

  return new EventStreamListener(config);
}
