import type { AgentEventPayload } from './types.js';

/**
 * 事件协调器
 * 
 * 协调 LogWatcher 和 SessionFileWatcher 的事件，合并工具参数
 * 
 * LogWatcher: 捕获 tool start/end 事件（有 runId）
 * SessionFileWatcher: 捕获工具参数（有 toolCallId）
 * 
 * 协调逻辑：
 * 1. SessionFileWatcher 捕获工具调用时，存储 toolCallId -> 参数映射
 * 2. LogWatcher 捕获 tool start 时，查找对应的参数并合并
 */
export class EventCoordinator {
  private toolCallMap: Map<string, {
    tool: string;
    args: Record<string, unknown>;
    argsSummary: string;
  }> = new Map();
  
  private pendingToolStarts: Map<string, AgentEventPayload[]> = new Map();

  /**
   * 处理来自 SessionFileWatcher 的工具调用
   */
  handleToolCall(toolCallId: string, tool: string, args: Record<string, unknown>, argsSummary: string): void {
    this.toolCallMap.set(toolCallId, { tool, args, argsSummary });
    
    // 检查是否有等待的 tool start 事件
    const pending = this.pendingToolStarts.get(toolCallId);
    if (pending) {
      for (const event of pending) {
        this.enrichEvent(event, toolCallId);
      }
      this.pendingToolStarts.delete(toolCallId);
    }
  }

  /**
   * 处理来自 LogWatcher 的工具事件
   * 返回增强后的事件
   */
  enrichEvent(event: AgentEventPayload, toolCallId?: string): AgentEventPayload {
    if (event.stream !== 'tool') {
      return event;
    }

    const toolData = event.data as any;
    
    // 如果事件已经有参数，直接返回
    if (toolData.args || toolData.rawArgs) {
      return event;
    }

    // 尝试从 toolCallId 查找参数
    if (toolCallId) {
      const toolInfo = this.toolCallMap.get(toolCallId);
      if (toolInfo) {
        return {
          ...event,
          data: {
            ...toolData,
            args: toolInfo.argsSummary,
            rawArgs: toolInfo.args
          }
        };
      }
      
      // 参数还没到，存储等待
      if (!this.pendingToolStarts.has(toolCallId)) {
        this.pendingToolStarts.set(toolCallId, []);
      }
      this.pendingToolStarts.get(toolCallId)!.push(event);
      
      return event;
    }

    return event;
  }

  /**
   * 清理过期的映射（防止内存泄漏）
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分钟
    
    // 清理 toolCallMap
    // 简单策略：保留最近 1000 个
    if (this.toolCallMap.size > 1000) {
      const firstKey = this.toolCallMap.keys().next().value;
      if (firstKey) {
        this.toolCallMap.delete(firstKey);
      }
    }
    
    // 清理 pendingToolStarts
    for (const [id, events] of this.pendingToolStarts.entries()) {
      // 移除超过 5 分钟的事件
      const recent = events.filter(e => now - e.ts < maxAge);
      if (recent.length === 0) {
        this.pendingToolStarts.delete(id);
      } else if (recent.length < events.length) {
        this.pendingToolStarts.set(id, recent);
      }
    }
  }
}
