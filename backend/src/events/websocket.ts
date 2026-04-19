/**
 * WebSocket Server
 *
 * Accepts client connections and routes Stellar contract events to
 * appropriate clients based on user role and subscribed quests.
 * Pushes events within 5 seconds of occurrence.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { StellarEvent } from './listener.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = 'admin' | 'organizer' | 'ambassador';

interface ClientInfo {
  ws: WebSocket;
  role: UserRole;
  userId: string;
  /** Quest IDs this client is subscribed to */
  subscribedQuests: Set<number>;
}

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe';
  questIds?: number[];
}

// ---------------------------------------------------------------------------
// EventWebSocketServer
// ---------------------------------------------------------------------------

export class EventWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();

  /**
   * Attach the WebSocket server to an existing HTTP server.
   */
  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws/events' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    console.log('[WebSocket] Server attached at /ws/events');
  }

  /**
   * Broadcast a Stellar event to relevant clients.
   */
  broadcast(event: StellarEvent): void {
    for (const [, client] of this.clients) {
      if (this.shouldReceive(client, event)) {
        this.send(client.ws, {
          type: 'event',
          payload: event,
        });
      }
    }
  }

  /**
   * Get the number of connected clients.
   */
  get clientCount(): number {
    return this.clients.size;
  }

  /**
   * Shut down the WebSocket server.
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
    console.log('[WebSocket] Server closed.');
  }

  // ---- Private methods ----

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    // Extract auth info from query params (placeholder — real impl uses JWT)
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const role = (url.searchParams.get('role') ?? 'ambassador') as UserRole;
    const userId = url.searchParams.get('userId') ?? `anon-${Date.now()}`;

    const clientId = `${userId}-${Date.now()}`;
    const clientInfo: ClientInfo = {
      ws,
      role,
      userId,
      subscribedQuests: new Set(),
    };

    this.clients.set(clientId, clientInfo);
    console.log(`[WebSocket] Client connected: ${clientId} (role=${role})`);

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      payload: { clientId, role },
    });

    // Handle incoming messages (subscribe/unsubscribe)
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        this.handleClientMessage(clientId, msg);
      } catch {
        this.send(ws, { type: 'error', payload: { message: 'Invalid message format' } });
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
    });

    ws.on('error', (err: Error) => {
      console.error(`[WebSocket] Client error (${clientId}):`, err.message);
      this.clients.delete(clientId);
    });
  }

  private handleClientMessage(clientId: string, msg: ClientMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (msg.type === 'subscribe' && msg.questIds) {
      for (const id of msg.questIds) {
        client.subscribedQuests.add(id);
      }
      this.send(client.ws, {
        type: 'subscribed',
        payload: { questIds: Array.from(client.subscribedQuests) },
      });
    }

    if (msg.type === 'unsubscribe' && msg.questIds) {
      for (const id of msg.questIds) {
        client.subscribedQuests.delete(id);
      }
      this.send(client.ws, {
        type: 'unsubscribed',
        payload: { questIds: Array.from(client.subscribedQuests) },
      });
    }
  }

  /**
   * Determine if a client should receive a given event based on role
   * and quest subscriptions.
   */
  private shouldReceive(client: ClientInfo, event: StellarEvent): boolean {
    // Admins receive all events
    if (client.role === 'admin') return true;

    // Pool events go to everyone on the swap interface
    if (event.type.startsWith('pool:')) return true;

    // Quest-specific events: check if client is subscribed
    const questId = event.data.quest_id as number | undefined;
    if (questId !== undefined && client.subscribedQuests.has(questId)) {
      return true;
    }

    // Quest activation events go to all ambassadors
    if (event.type === 'quest:state_change' && client.role === 'ambassador') {
      return true;
    }

    // Submission events go to the quest organizer
    if (event.type === 'quest:submission' && client.role === 'organizer') {
      return client.subscribedQuests.has(questId ?? -1);
    }

    // Reward events go to the receiving ambassador
    if (event.type === 'treasury:reward') {
      const ambassadorId = event.data.ambassador_id as string | undefined;
      if (ambassadorId === client.userId) return true;
    }

    return false;
  }

  private send(ws: WebSocket, data: Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an EventWebSocketServer instance.
 */
export function createWebSocketServer(): EventWebSocketServer {
  return new EventWebSocketServer();
}
