import { watch } from 'fs';
import { readFile } from 'fs/promises';
import type { AgentEventPayload } from './types.js';

export class SessionFileWatcher {
  private sessionsDir: string;
  private watcher: ReturnType<typeof watch> | null = null;
  private onEvent: ((event: AgentEventPayload) => void) | null = null;
  private filePositions: Map<string, number> = new Map();
  private toolCallIdMap: Map<string, { tool: string; args: Record<string, unknown> }> = new Map();

  constructor() {
    this.sessionsDir = process.env.HOME + '/.openclaw/agents/main/sessions';
  }

  start(): void {
    console.log(`[SessionFileWatcher] Watching ${this.sessionsDir}`);

    // 初始扫描现有文件
    this.scanExistingFiles();

    // 监听文件变化
    this.watcher = watch(this.sessionsDir, (_eventType, filename) => {
      if (filename && filename.endsWith('.jsonl') && !filename.includes('.reset.') && !filename.includes('.deleted.')) {
        const filePath = `${this.sessionsDir}/${filename}`;
        this.readFileChanges(filePath);
      }
    });

    // 定期检查
    setInterval(() => this.scanExistingFiles(), 5000);
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

  private async scanExistingFiles(): Promise<void> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.sessionsDir);
      
      for (const file of files) {
        if (file.endsWith('.jsonl') && !file.includes('.reset.') && !file.includes('.deleted.')) {
          const filePath = `${this.sessionsDir}/${file}`;
          if (!this.filePositions.has(filePath)) {
            // 新文件，只读取最后位置
            const content = await readFile(filePath, 'utf-8');
            this.filePositions.set(filePath, content.length);
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  private async readFileChanges(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lastPosition = this.filePositions.get(filePath) || 0;

      if (content.length <= lastPosition) {
        return;
      }

      const newContent = content.slice(lastPosition);
      this.filePositions.set(filePath, content.length);

      // 解析新行
      const lines = newContent.split('\n').filter(line => line.trim());
      for (const line of lines) {
        this.parseLine(line);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  private parseLine(line: string): void {
    try {
      const data = JSON.parse(line);
      
      if (data.type === 'message' && data.message?.role === 'assistant') {
        const content = data.message.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'toolCall') {
              this.handleToolCall(item, data);
            }
          }
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  private handleToolCall(toolCall: any, messageData: any): void {
    if (!this.onEvent) return;

    const { id: toolCallId, name: tool, arguments: args } = toolCall;
    
    // 存储工具调用信息
    this.toolCallIdMap.set(toolCallId, { tool, args });

    // 生成参数摘要
    const argsSummary = this.formatArgs(tool, args);
    
    // 发送事件
    const event: AgentEventPayload = {
      runId: messageData.id || 'unknown',
      seq: Date.now(),
      stream: 'tool',
      ts: new Date(messageData.timestamp).getTime(),
      data: {
        tool,
        event: 'call',
        toolCallId,
        args: argsSummary,
        rawArgs: args
      },
      sessionKey: 'from-session-file'
    };

    this.onEvent(event);
    console.log(`[SessionFileWatcher] Tool call: ${tool} ${argsSummary.slice(0, 50)}`);
  }

  private formatArgs(tool: string, args: Record<string, unknown>): string {
    switch (tool) {
      case 'exec': {
        const command = args.command as string;
        return command ? `$ ${command}` : '';
      }
      case 'read': {
        const file = args.file as string;
        return file ? `📄 ${file}` : '';
      }
      case 'write': {
        const file = args.file as string;
        return file ? `📝 ${file}` : '';
      }
      case 'process': {
        const action = args.action as string;
        return action ? `⚡ ${action}` : '';
      }
      default:
        return JSON.stringify(args).slice(0, 100);
    }
  }
}
