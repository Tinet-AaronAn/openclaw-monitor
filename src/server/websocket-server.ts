import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { WSMessage, MonitorState, AgentEventPayload, Run, SessionEntry } from './types.js';

export class MonitorWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setup();
  }

  private setup(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial state
      this.sendInitialState(ws);
    });
  }

  private sendInitialState(_ws: WebSocket): void {
    // This will be called when client connects
    // The actual state will be sent by the monitor server
  }

  broadcastState(state: MonitorState): void {
    const message: WSMessage = { type: 'state', payload: state };
    this.broadcast(JSON.stringify(message));
  }

  broadcastEvent(event: AgentEventPayload): void {
    const message: WSMessage = { type: 'event', payload: event };
    this.broadcast(JSON.stringify(message));
  }

  broadcastRunStarted(run: Run): void {
    const message: WSMessage = { type: 'run_started', payload: run };
    this.broadcast(JSON.stringify(message));
  }

  broadcastRunCompleted(run: Run): void {
    const message: WSMessage = { type: 'run_completed', payload: run };
    this.broadcast(JSON.stringify(message));
  }

  broadcastSessionUpdated(sessionKey: string, entry: SessionEntry): void {
    const message: WSMessage = { type: 'session_updated', payload: { sessionKey, entry } };
    this.broadcast(JSON.stringify(message));
  }

  private broadcast(data: string): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  close(): void {
    this.wss.close();
  }
}
