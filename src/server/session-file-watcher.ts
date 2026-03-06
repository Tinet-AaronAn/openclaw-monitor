import { watch } from "fs";
import { readFile } from "fs/promises";
import type { AgentEventPayload } from "./types.js";

type SessionMessageCallback = (
  sessionId: string,
  message: string,
  sender: string,
  time: number,
) => void;

type SessionDeleteCallback = (sessionId: string) => void;

export class SessionFileWatcher {
  private sessionsDir: string;
  private watcher: ReturnType<typeof watch> | null = null;
  private onEvent: ((event: AgentEventPayload) => void) | null = null;
  private onSessionMessage: SessionMessageCallback | null = null;
  private onSessionDelete: SessionDeleteCallback | null = null;
  private filePositions: Map<string, number> = new Map();
  private toolCallIdMap: Map<
    string,
    { tool: string; args: Record<string, unknown> }
  > = new Map();
  // 新增：跟踪每个 session 的活动 run
  private activeRuns: Map<string, string> = new Map(); // sessionKey -> runId
  private runSeq: number = 0;

  constructor() {
    this.sessionsDir = process.env.HOME + "/.openclaw/agents/main/sessions";
  }

  start(): void {
    console.log(`[SessionFileWatcher] Watching ${this.sessionsDir}`);

    // 初始扫描现有文件
    this.scanExistingFiles();

    // 监听文件变化
    this.watcher = watch(this.sessionsDir, (eventType, filename) => {
      if (!filename || !filename.endsWith(".jsonl")) {
        return;
      }

      // 检查是否是删除/重置的文件
      if (filename.includes(".deleted.") || filename.includes(".reset.")) {
        // 提取 sessionId 并通知删除
        const sessionId = filename.split(".")[0];
        if (this.onSessionDelete) {
          this.onSessionDelete(sessionId);
        }
        console.log(`[SessionFileWatcher] Session deleted: ${sessionId}`);
        return;
      }

      // 正常文件变化
      if (eventType === "change" || eventType === "rename") {
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

  setSessionMessageCallback(callback: SessionMessageCallback): void {
    this.onSessionMessage = callback;
  }

  setSessionDeleteCallback(callback: SessionDeleteCallback): void {
    this.onSessionDelete = callback;
  }

  private async scanExistingFiles(): Promise<void> {
    try {
      const { readdir } = await import("fs/promises");
      const files = await readdir(this.sessionsDir);

      for (const file of files) {
        if (
          file.endsWith(".jsonl") &&
          !file.includes(".reset.") &&
          !file.includes(".deleted.")
        ) {
          const filePath = `${this.sessionsDir}/${file}`;
          if (!this.filePositions.has(filePath)) {
            // 新文件，只读取最后位置
            const content = await readFile(filePath, "utf-8");
            this.filePositions.set(filePath, content.length);

            // 加载最后一条用户消息
            const sessionId = file.replace(".jsonl", "");
            this.loadLastUserMessage(filePath, sessionId, content);
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  private async loadLastUserMessage(
    filePath: string,
    _sessionId: string,
    content?: string,
  ): Promise<void> {
    try {
      if (!content) {
        content = await readFile(filePath, "utf-8");
      }

      const lines = content.split("\n").filter((line) => line.trim());
      // 从后往前找最后一条用户消息
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const data = JSON.parse(lines[i]);
          if (data.type === "message" && data.message?.role === "user") {
            this.handleUserMessage(data, filePath);
            break;
          }
        } catch (e) {
          // 忽略
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  private async readFileChanges(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lastPosition = this.filePositions.get(filePath) || 0;

      if (content.length <= lastPosition) {
        return;
      }

      const newContent = content.slice(lastPosition);
      this.filePositions.set(filePath, content.length);

      // 解析新行
      const lines = newContent.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        this.parseLine(line, filePath);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  private parseLine(line: string, filePath?: string): void {
    try {
      const data = JSON.parse(line);

      // 捕获用户消息
      if (data.type === "message" && data.message?.role === "user") {
        this.handleUserMessage(data, filePath);
      }

      // 捕获 assistant 消息中的 tool call
      if (data.type === "message" && data.message?.role === "assistant") {
        const content = data.message.content;
        // 从文件路径提取 sessionId
        const sessionId = filePath
          ? filePath.split("/").pop()?.replace(".jsonl", "") || "unknown"
          : data.sessionId || "unknown";
        const sessionKey = `session:${sessionId}`;

        // 如果该 session 有活动 run，发送 run_completed 事件
        if (Array.isArray(content)) {
          const hasToolCalls = content.some((item) => item.type === "toolCall");

          // 如果只有文本回复（没有 tool calls），这是 run 完成的信号
          if (!hasToolCalls) {
            const activeRunId = this.activeRuns.get(sessionKey);
            if (activeRunId) {
              this.handleRunCompleted(activeRunId, sessionKey, data.timestamp);
            }
          }

          // 处理 tool calls
          for (const item of content) {
            if (item.type === "toolCall") {
              this.handleToolCall(item, data, filePath);
            }
          }
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  private handleUserMessage(messageData: any, filePath?: string): void {
    if (!this.onSessionMessage) return;

    // 提取 session ID
    const sessionId = filePath
      ? filePath.split("/").pop()?.replace(".jsonl", "")
      : messageData.id;
    if (!sessionId) return;

    const message = messageData.message;
    const content = message?.content;

    // 提取消息文本
    let messageText = "";
    if (typeof content === "string") {
      messageText = content;
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === "text" && item.text) {
          messageText = item.text;
          break;
        }
      }
    }

    if (!messageText) return;

    // 提取发送者信息
    let sender = "user";

    // 优先从 Sender (untrusted metadata) 块中解析（群聊格式）
    const senderMatch = messageText.match(
      /Sender \(untrusted metadata\):[\s\S]*?"label"\s*:\s*"([^"]+)"/,
    );
    if (senderMatch) {
      sender = senderMatch[1];
    } else {
      // 尝试从 Conversation info 块中解析 sender_id（私聊格式）
      const senderIdMatch = messageText.match(/"sender_id"\s*:\s*"([^"]+)"/);
      if (senderIdMatch) {
        sender = senderIdMatch[1];
      } else if (message.sender) {
        sender = message.sender;
      } else if (message.origin?.label) {
        sender = message.origin.label;
      }
    }

    // 过滤掉 OpenClaw 系统添加的 metadata 块
    let displayText = messageText;

    // 移除所有 ```json ... ``` 块及其前面的标题
    displayText = displayText
      // 移除 Conversation info 块
      .replace(
        /Conversation info \(untrusted metadata\):[\s\S]*?```json[\s\S]*?```[\s]*/g,
        "",
      )
      // 移除 Sender 块
      .replace(
        /Sender \(untrusted metadata\):[\s\S]*?```json[\s\S]*?```[\s]*/g,
        "",
      )
      // 移除 Queued messages 块
      .replace(/\[Queued messages while agent was busy\][\s\S]*?---[\s]*/g, "")
      .trim();

    // 如果过滤后为空，使用原始文本
    if (!displayText || displayText.length < 2) {
      displayText = messageText;
    }

    // 提取时间戳
    const timestamp = messageData.timestamp
      ? new Date(messageData.timestamp).getTime()
      : Date.now();

    // 通知消息
    this.onSessionMessage(sessionId, displayText, sender, timestamp);
    console.log(
      `[SessionFileWatcher] User message from ${sender}: ${displayText.slice(0, 50)}...`,
    );
  }

  private handleToolCall(
    toolCall: any,
    messageData: any,
    filePath?: string,
  ): void {
    if (!this.onEvent) return;

    const { id: toolCallId, name: tool, arguments: args } = toolCall;

    // 从文件路径提取 sessionId
    const sessionId = filePath
      ? filePath.split("/").pop()?.replace(".jsonl", "") || "unknown"
      : messageData.sessionId || "unknown";
    const sessionKey = `session:${sessionId}`;

    // 存储工具调用信息
    this.toolCallIdMap.set(toolCallId, { tool, args });

    // 生成参数摘要
    const argsSummary = this.formatArgs(tool, args);

    // 检查是否需要发送 run_started 事件
    const activeRunId = this.activeRuns.get(sessionKey);
    const runId = activeRunId || `run-${sessionId}-${Date.now()}`;

    // 如果该 session 没有活动 run，发送 run_started
    if (!activeRunId) {
      this.activeRuns.set(sessionKey, runId);
      this.runSeq++;

      const runStartedEvent: AgentEventPayload = {
        runId,
        seq: this.runSeq,
        stream: "lifecycle",
        ts: new Date(messageData.timestamp).getTime(),
        data: {
          event: "run_started",
          timestamp: messageData.timestamp,
          sessionId,
        },
        sessionKey,
      };

      this.onEvent(runStartedEvent);
      console.log(
        `[SessionFileWatcher] Run started: ${runId.slice(0, 16)} for session ${sessionKey.slice(0, 20)}`,
      );
    }

    // 发送 tool 事件
    const toolEvent: AgentEventPayload = {
      runId,
      seq: ++this.runSeq,
      stream: "tool",
      ts: new Date(messageData.timestamp).getTime(),
      data: {
        tool,
        event: "call",
        toolCallId,
        args: argsSummary,
        rawArgs: args,
      },
      sessionKey,
    };

    this.onEvent(toolEvent);
    console.log(
      `[SessionFileWatcher] Tool call: ${tool} ${argsSummary.slice(0, 50)}`,
    );
  }

  /**
   * 处理 run 完成事件
   */
  private handleRunCompleted(
    runId: string,
    sessionKey: string,
    timestamp: string,
  ): void {
    if (!this.onEvent) return;

    // 从 activeRuns 中移除
    this.activeRuns.delete(sessionKey);

    // 发送 run_completed 事件
    const completedEvent: AgentEventPayload = {
      runId,
      seq: ++this.runSeq,
      stream: "lifecycle",
      ts: new Date(timestamp).getTime(),
      data: {
        event: "run_completed",
        timestamp,
        sessionId: sessionKey.split(":")[1],
      },
      sessionKey,
    };

    this.onEvent(completedEvent);
    console.log(
      `[SessionFileWatcher] Run completed: ${runId.slice(0, 16)} for session ${sessionKey.slice(0, 20)}`,
    );
  }

  private formatArgs(tool: string, args: Record<string, unknown>): string {
    switch (tool) {
      case "exec": {
        const command = args.command as string;
        return command ? `$ ${command}` : "";
      }
      case "read": {
        const file = args.file as string;
        return file ? `📄 ${file}` : "";
      }
      case "write": {
        const file = args.file as string;
        return file ? `📝 ${file}` : "";
      }
      case "process": {
        const action = args.action as string;
        return action ? `⚡ ${action}` : "";
      }
      default:
        return JSON.stringify(args).slice(0, 100);
    }
  }
}
