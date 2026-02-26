import { watch } from 'fs';
import { readFile } from 'fs/promises';
import type { AgentEventPayload } from './types.js';

export class OpenClawLogWatcher {
  private logFile: string;
  private lastPosition: number = 0;
  private watcher: ReturnType<typeof watch> | null = null;
  private onEvent: ((event: AgentEventPayload) => void) | null = null;
  private seqCounter: number = 0;
  
  // runId -> sessionId 映射
  private runSessionMap: Map<string, string> = new Map();
  
  // sessionId -> sessionKey 映射（从 openclaw sessions 获取）
  private sessionKeyMap: Map<string, string> = new Map();

  constructor() {
    const today = new Date().toISOString().slice(0, 10);
    this.logFile = `/tmp/openclaw/openclaw-${today}.log`;
  }

  start(): void {
    console.log(`[LogWatcher] Watching ${this.logFile}`);
    this.initializePosition();

    this.watcher = watch(this.logFile, (eventType) => {
      if (eventType === 'change') {
        this.readNewLogs();
      }
    });

    setInterval(() => this.readNewLogs(), 1000);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  setEventCallback(callback: (event: AgentEventPayload) => void): void {
    this.onEvent = callback;
  }

  private async initializePosition(): Promise<void> {
    try {
      const content = await readFile(this.logFile, 'utf-8');
      this.lastPosition = content.length;
      console.log(`[LogWatcher] Initial position: ${this.lastPosition}`);
      
      // 扫描已有日志，建立 runId -> sessionId 映射
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          if (line.startsWith('{')) {
            const log = JSON.parse(line);
            const message = log['1'] || log.message || '';
            if (message.includes('embedded run start')) {
              this.parseRunStart(message);
            }
          }
        } catch (error) {
          // 忽略
        }
      }
      
      // 获取 sessionId -> sessionKey 映射
      await this.loadSessionKeyMap();
      
      console.log(`[LogWatcher] Loaded ${this.runSessionMap.size} run->session mappings`);
      console.log(`[LogWatcher] Loaded ${this.sessionKeyMap.size} session->key mappings`);
    } catch (error) {
      console.error('[LogWatcher] Failed to initialize position:', error);
    }
  }

  private async loadSessionKeyMap(): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('openclaw sessions --json', { encoding: 'utf-8' });
      
      // 跳过开头的警告信息
      const jsonStart = output.indexOf('{');
      const jsonOutput = output.slice(jsonStart);
      const data = JSON.parse(jsonOutput);
      
      if (data.sessions) {
        for (const session of data.sessions) {
          if (session.sessionId && session.key) {
            this.sessionKeyMap.set(session.sessionId, session.key);
          }
        }
      }
    } catch (error) {
      console.error('[LogWatcher] Failed to load session key map:', error);
    }
  }

  private async readNewLogs(): Promise<void> {
    try {
      const content = await readFile(this.logFile, 'utf-8');

      if (content.length <= this.lastPosition) {
        return;
      }

      const newContent = content.slice(this.lastPosition);
      this.lastPosition = content.length;

      const lines = newContent.split('\n').filter(line => line.trim());
      for (const line of lines) {
        this.parseLogLine(line);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  private parseLogLine(line: string): void {
    try {
      if (line.startsWith('{')) {
        const log = JSON.parse(line);
        const message = log['1'] || log.message || '';
        const time = log.time || new Date().toISOString();
        
        // 解析 run start 以获取 sessionId
        if (message.includes('embedded run start')) {
          this.parseRunStart(message);
          // 发送 run_started 事件
          this.emitLifecycleEvent(message, time, 'run_started');
        }
        
        // 解析 run done 事件
        if (message.includes('embedded run done')) {
          this.parseRunDone(message, time);
        }
        
        // 解析 tool 事件
        if (message.includes('embedded run tool')) {
          this.handleAgentLog(log);
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  private parseRunStart(message: string): void {
    // embedded run start: runId=xxx sessionId=yyy provider=zzz model=aaa
    const match = message.match(/embedded run start: runId=([^\s]+) sessionId=([^\s]+)/);
    if (match) {
      const [, runId, sessionId] = match;
      this.runSessionMap.set(runId, sessionId);
      console.log(`[LogWatcher] Mapped runId ${runId.slice(0, 8)} -> sessionId ${sessionId.slice(0, 8)}`);
    }
  }

  private parseRunDone(message: string, time: string): void {
    // embedded run done: runId=xxx sessionId=yyy durationMs=zzz aborted=false
    const match = message.match(/embedded run done: runId=([^\s]+) sessionId=([^\s]+) durationMs=(\d+) aborted=(true|false)/);
    if (match) {
      const [, runId, sessionId, durationMs, aborted] = match;
      
      // 发送 run_completed 或 run_aborted 事件
      const eventType = aborted === 'true' ? 'run_aborted' : 'run_completed';
      this.emitLifecycleEvent(message, time, eventType, runId, sessionId, parseInt(durationMs));
    }
  }

  private handleAgentLog(log: any): void {
    const message = log['1'] || log.message || '';
    const time = log.time || new Date().toISOString();

    const startMatch = message.match(/embedded run tool start: runId=([^\s]+) tool=([^\s]+) toolCallId=([^\s]+)/);
    if (startMatch) {
      const [, runId, tool, toolCallId] = startMatch;
      this.emitToolEvent(runId, tool, 'start', time, toolCallId);
      return;
    }

    const endMatch = message.match(/embedded run tool end: runId=([^\s]+) tool=([^\s]+) toolCallId=([^\s]+)/);
    if (endMatch) {
      const [, runId, tool, toolCallId] = endMatch;
      this.emitToolEvent(runId, tool, 'end', time, toolCallId);
      return;
    }
  }

  private emitToolEvent(runId: string, tool: string, eventType: 'start' | 'end', time: string, toolCallId?: string): void {
    if (!this.onEvent) return;

    this.seqCounter++;
    
    // 获取 sessionId
    const sessionId = this.runSessionMap.get(runId);
    
    // 获取正确的 sessionKey
    let sessionKey = 'unknown';
    if (sessionId) {
      sessionKey = this.sessionKeyMap.get(sessionId) || `session:${sessionId.slice(0, 8)}`;
    }
    
    const event: AgentEventPayload = {
      runId,
      seq: this.seqCounter,
      stream: 'tool',
      ts: new Date(time).getTime(),
      data: {
        tool,
        event: eventType,
        timestamp: time,
        sessionId: sessionId || undefined,
        toolCallId: toolCallId || undefined
      },
      sessionKey
    };

    this.onEvent(event);
    console.log(`[LogWatcher] Captured: ${tool} ${eventType} for runId ${runId.slice(0, 8)} (session: ${sessionKey.slice(0, 20)})`);
  }

  private emitLifecycleEvent(
    message: string, 
    time: string, 
    eventType: 'run_started' | 'run_completed' | 'run_aborted' | 'run_failed',
    explicitRunId?: string,
    explicitSessionId?: string,
    durationMs?: number
  ): void {
    if (!this.onEvent) return;

    this.seqCounter++;

    // 尝试从 message 中解析 runId 和 sessionId（如果没有显式提供）
    let runId = explicitRunId;
    let sessionId = explicitSessionId;
    
    if (!runId) {
      const match = message.match(/runId=([^\s]+)/);
      if (match) {
        runId = match[1];
      }
    }
    
    if (!sessionId && runId) {
      sessionId = this.runSessionMap.get(runId);
    }

    // 获取正确的 sessionKey
    let sessionKey = 'unknown';
    if (sessionId) {
      sessionKey = this.sessionKeyMap.get(sessionId) || `session:${sessionId.slice(0, 8)}`;
    }

    const event: AgentEventPayload = {
      runId: runId || 'unknown',
      seq: this.seqCounter,
      stream: 'lifecycle',
      ts: new Date(time).getTime(),
      data: {
        event: eventType,
        timestamp: time,
        sessionId: sessionId || undefined,
        durationMs: durationMs || undefined
      },
      sessionKey
    };

    this.onEvent(event);
    console.log(`[LogWatcher] Lifecycle: ${eventType} for runId ${runId?.slice(0, 8) || 'unknown'} (session: ${sessionKey.slice(0, 20)})`);
  }
}
