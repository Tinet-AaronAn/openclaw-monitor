// OpenClaw CLI 轮询 - 定期获取 sessions 数据

import { OpenClawCLI } from './openclaw-cli.js';
import type { MonitorWebSocketServer } from './websocket-server.js';

export function startCLIPolling(
  wsServer: MonitorWebSocketServer,
  interval: number = 5000
): void {
  const cli = new OpenClawCLI();

  console.log(`[CLI Polling] Starting with interval: ${interval}ms`);

  // 初始加载
  pollSessions();

  // 定期轮询
  setInterval(pollSessions, interval);

  async function pollSessions() {
    try {
      const sessions = await cli.getSessions();

      if (sessions.length > 0) {
        console.log(`[CLI Polling] Found ${sessions.length} sessions`);

        // 更新 sessions 数据
        for (const session of sessions) {
          wsServer.broadcastSessionUpdated(session.sessionKey, session as any);
        }
      }
    } catch (error) {
      console.error('[CLI Polling] Error:', error);
    }
  }
}
