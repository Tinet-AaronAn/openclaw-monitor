import { exec } from 'child_process';
import { promisify } from 'util';
import type { Session } from './types.js';

const execAsync = promisify(exec);

export class OpenClawCLI {
  async getSessions(): Promise<Session[]> {
    try {
      const { stdout } = await execAsync('openclaw sessions --json');
      const data = JSON.parse(stdout);

      if (!data.sessions || !Array.isArray(data.sessions)) {
        return [];
      }

      return data.sessions.map((s: any) => ({
        sessionKey: s.key,
        sessionId: s.sessionId,
        updatedAt: s.updatedAt,
        chatType: s.kind,
        model: s.model,
        modelProvider: s.modelProvider,
        inputTokens: s.inputTokens,
        outputTokens: s.outputTokens,
        totalTokens: s.totalTokens,
        totalTokensFresh: s.totalTokensFresh,
        contextTokens: s.contextTokens,
        systemSent: s.systemSent,
        abortedLastRun: s.abortedLastRun,
      }));
    } catch (error) {
      console.error('[OpenClawCLI] Failed to get sessions:', error);
      return [];
    }
  }

  async getActiveSessions(minutes: number = 60): Promise<Session[]> {
    try {
      const { stdout } = await execAsync(`openclaw sessions --json --active ${minutes}`);
      const data = JSON.parse(stdout);
      return data.sessions || [];
    } catch (error) {
      console.error('[OpenClawCLI] Failed to get active sessions:', error);
      return [];
    }
  }

  async getStatus(): Promise<any> {
    try {
      const { stdout } = await execAsync('openclaw gateway call status --json');
      // 移除可能的警告信息
      const jsonStart = stdout.indexOf('{');
      const jsonStr = stdout.slice(jsonStart);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('[OpenClawCLI] Failed to get status:', error);
      return null;
    }
  }

  async getHealth(): Promise<any> {
    try {
      const { stdout } = await execAsync('openclaw gateway call health --json');
      const jsonStart = stdout.indexOf('{');
      const jsonStr = stdout.slice(jsonStart);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('[OpenClawCLI] Failed to get health:', error);
      return null;
    }
  }
}
