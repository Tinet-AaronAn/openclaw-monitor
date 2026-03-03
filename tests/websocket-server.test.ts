import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { MonitorWebSocketServer } from '../src/server/websocket-server.js';
import type { MonitorState, AgentEventPayload, Run, SessionEntry } from '../src/server/types.js';
import { createServer } from 'http';

// 生成随机端口，避免测试冲突
function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

describe('MonitorWebSocketServer', () => {
  let server: MonitorWebSocketServer;
  let TEST_PORT: number;

  beforeEach(async () => {
    TEST_PORT = await getAvailablePort();
    server = new MonitorWebSocketServer(TEST_PORT);
    // 等待服务器启动
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    server.close();
    // 确保端口释放
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('connection management', () => {
    it('should accept WebSocket connections', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          expect(server.getConnectedClients()).toBe(1);
          client.close();
          resolve();
        });
        client.on('error', reject);
      });
    });

    it('should track connected clients', async () => {
      expect(server.getConnectedClients()).toBe(0);

      const client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
      const client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>(resolve => {
        let openCount = 0;
        const checkOpen = () => {
          openCount++;
          if (openCount === 2) {
            expect(server.getConnectedClients()).toBe(2);
            client1.close();
            client2.close();
            resolve();
          }
        };
        client1.on('open', checkOpen);
        client2.on('open', checkOpen);
      });
    });

    it('should remove client from tracking on disconnect', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          expect(server.getConnectedClients()).toBe(1);
          client.close();
        });
        client.on('close', () => {
          // 等待服务器处理断开
          setTimeout(() => {
            expect(server.getConnectedClients()).toBe(0);
            resolve();
          }, 50);
        });
        client.on('error', reject);
      });
    });
  });

  describe('state provider', () => {
    it('should send initial state to new client', async () => {
      const mockState: MonitorState = {
        sessions: [],
        runs: [],
        events: [],
        connectedClients: 1,
        startedAt: Date.now()
      };

      server.setStateProvider(() => mockState);

      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          expect(message.type).toBe('state');
          expect(message.payload).toEqual(mockState);
          client.close();
          resolve();
        });
        client.on('error', reject);
      });
    });
  });

  describe('broadcasting', () => {
    it('should broadcast state to all clients', async () => {
      const client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
      const client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

      const messages1: any[] = [];
      const messages2: any[] = [];

      await new Promise<void>((resolve, reject) => {
        let openCount = 0;
        const checkOpen = () => {
          openCount++;
          if (openCount === 2) {
            const state: MonitorState = {
              sessions: [],
              runs: [{ runId: 'test-run', status: 'running', startedAt: Date.now(), eventCount: 0 }],
              events: [],
              connectedClients: 2,
              startedAt: Date.now()
            };
            server.broadcastState(state);
          }
        };

        client1.on('open', checkOpen);
        client2.on('open', checkOpen);

        client1.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'state' && msg.payload.runs.length > 0) {
            messages1.push(msg);
            checkComplete();
          }
        });

        client2.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'state' && msg.payload.runs.length > 0) {
            messages2.push(msg);
            checkComplete();
          }
        });

        const checkComplete = () => {
          if (messages1.length > 0 && messages2.length > 0) {
            expect(messages1[0].type).toBe('state');
            expect(messages2[0].type).toBe('state');
            client1.close();
            client2.close();
            resolve();
          }
        };

        client1.on('error', reject);
        client2.on('error', reject);

        // 超时保护
        setTimeout(() => {
          reject(new Error('Timeout waiting for broadcast'));
        }, 3000);
      });
    });

    it('should broadcast events to all clients', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          const event: AgentEventPayload = {
            runId: 'run-event-test',
            seq: 0,
            stream: 'tool',
            ts: Date.now(),
            data: { tool: 'read', event: 'start' },
            sessionKey: 'session-1'
          };
          server.broadcastEvent(event);
        });

        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'event') {
            expect(msg.payload.runId).toBe('run-event-test');
            client.close();
            resolve();
          }
        });

        client.on('error', reject);

        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
    });

    it('should broadcast run_started event', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          const run: Run = {
            runId: 'run-started-test',
            status: 'running',
            startedAt: Date.now(),
            eventCount: 0
          };
          server.broadcastRunStarted(run);
        });

        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'run_started') {
            expect(msg.payload.runId).toBe('run-started-test');
            expect(msg.payload.status).toBe('running');
            client.close();
            resolve();
          }
        });

        client.on('error', reject);

        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
    });

    it('should broadcast run_completed event', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          const run: Run = {
            runId: 'run-completed-test',
            status: 'completed',
            startedAt: Date.now() - 5000,
            completedAt: Date.now(),
            eventCount: 5
          };
          server.broadcastRunCompleted(run);
        });

        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'run_completed') {
            expect(msg.payload.runId).toBe('run-completed-test');
            expect(msg.payload.status).toBe('completed');
            client.close();
            resolve();
          }
        });

        client.on('error', reject);

        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
    });

    it('should broadcast session_updated event', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => {
          const entry: SessionEntry = {
            sessionId: 'session-updated-test',
            updatedAt: Date.now(),
            model: 'zai/glm-5'
          };
          server.broadcastSessionUpdated('session-key-123', entry);
        });

        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'session_updated') {
            expect(msg.payload.sessionKey).toBe('session-key-123');
            expect(msg.payload.entry.sessionId).toBe('session-updated-test');
            client.close();
            resolve();
          }
        });

        client.on('error', reject);

        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
    });
  });

  describe('error handling', () => {
    it('should handle client errors gracefully', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve) => {
        client.on('open', () => {
          expect(server.getConnectedClients()).toBe(1);
          // 强制关闭连接
          client.terminate();
          
          // 等待服务器处理错误
          setTimeout(() => {
            expect(server.getConnectedClients()).toBe(0);
            resolve();
          }, 100);
        });
      });
    });
  });
});
