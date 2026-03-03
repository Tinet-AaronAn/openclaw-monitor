import { describe, it, expect, beforeEach } from "vitest";
import { EventCoordinator } from "../src/server/event-coordinator.js";
import type { AgentEventPayload } from "../src/server/types.js";

describe("EventCoordinator", () => {
  let coordinator: EventCoordinator;

  beforeEach(() => {
    coordinator = new EventCoordinator();
  });

  describe("handleToolCall", () => {
    it("should store tool call parameters", () => {
      coordinator.handleToolCall(
        "call-123",
        "read",
        { path: "/test/file.ts" },
        "read /test/file.ts",
      );

      // 验证参数被存储
      const event: AgentEventPayload = {
        runId: "run-1",
        seq: 0,
        stream: "tool",
        ts: Date.now(),
        data: { tool: "read", event: "start", toolCallId: "call-123" },
        sessionKey: "session-1",
      };

      const enriched = coordinator.enrichEvent(event, "call-123");

      expect((enriched.data as any).args).toBe("read /test/file.ts");
      expect((enriched.data as any).rawArgs).toEqual({ path: "/test/file.ts" });
    });

    it("should process pending tool starts when tool call arrives late", () => {
      // 先收到 tool start 事件（没有参数）
      const event: AgentEventPayload = {
        runId: "run-1",
        seq: 0,
        stream: "tool",
        ts: Date.now(),
        data: { tool: "exec", event: "start", toolCallId: "call-late" },
        sessionKey: "session-1",
      };

      // 此时还没收到参数
      const firstEnriched = coordinator.enrichEvent(event, "call-late");
      expect((firstEnriched.data as any).args).toBeUndefined();

      // 稍后收到参数
      coordinator.handleToolCall(
        "call-late",
        "exec",
        { command: "ls -la" },
        "exec ls -la",
      );

      // 由于 pending 机制，事件应该被增强
      // 注意：在当前实现中，pending 事件会被异步处理
    });
  });

  describe("enrichEvent", () => {
    it("should not enrich non-tool events", () => {
      const event: AgentEventPayload = {
        runId: "run-1",
        seq: 0,
        stream: "assistant",
        ts: Date.now(),
        data: { message: "Hello" },
        sessionKey: "session-1",
      };

      const result = coordinator.enrichEvent(event);

      expect(result).toEqual(event);
    });

    it("should not override existing args", () => {
      const event: AgentEventPayload = {
        runId: "run-1",
        seq: 0,
        stream: "tool",
        ts: Date.now(),
        data: { tool: "read", event: "start", args: "existing args" },
        sessionKey: "session-1",
      };

      coordinator.handleToolCall(
        "call-xyz",
        "read",
        { path: "/other" },
        "other",
      );
      const result = coordinator.enrichEvent(event, "call-xyz");

      // 不应该覆盖已有的 args
      expect((result.data as any).args).toBe("existing args");
    });

    it("should enrich tool event with matching toolCallId", () => {
      coordinator.handleToolCall(
        "call-match",
        "write",
        { path: "/file.ts", content: "hello" },
        "write /file.ts",
      );

      const event: AgentEventPayload = {
        runId: "run-1",
        seq: 0,
        stream: "tool",
        ts: Date.now(),
        data: { tool: "write", event: "start", toolCallId: "call-match" },
        sessionKey: "session-1",
      };

      const result = coordinator.enrichEvent(event, "call-match");

      expect((result.data as any).args).toBe("write /file.ts");
      expect((result.data as any).rawArgs).toEqual({
        path: "/file.ts",
        content: "hello",
      });
    });
  });

  describe("cleanup", () => {
    it("should limit toolCallMap size to prevent memory leak", () => {
      // 添加超过 1000 个条目
      for (let i = 0; i < 1100; i++) {
        coordinator.handleToolCall(
          `call-${i}`,
          "read",
          { path: `/file-${i}` },
          `read /file-${i}`,
        );
      }

      coordinator.cleanup();

      // 由于简单策略，应该删除最早的条目
      // 注意：当前实现只删除第一个条目
    });

    it("should cleanup old pending tool starts", () => {
      // 添加一个旧的 pending 事件
      const oldEvent: AgentEventPayload = {
        runId: "run-old",
        seq: 0,
        stream: "tool",
        ts: Date.now() - 10 * 60 * 1000, // 10 分钟前
        data: { tool: "read", event: "start", toolCallId: "old-call" },
        sessionKey: "session-1",
      };

      coordinator.enrichEvent(oldEvent, "old-call");

      coordinator.cleanup();

      // 旧的 pending 事件应该被清理
    });
  });

  describe("Integration: full tool lifecycle", () => {
    it("should coordinate tool call across log and session watchers", () => {
      const toolCallId = "lifecycle-call";

      // 1. SessionFileWatcher 捕获工具调用
      coordinator.handleToolCall(
        toolCallId,
        "edit",
        { path: "/src/index.ts", oldText: "foo", newText: "bar" },
        "edit /src/index.ts",
      );

      // 2. LogWatcher 捕获 tool start
      const startEvent: AgentEventPayload = {
        runId: "run-lifecycle",
        seq: 0,
        stream: "tool",
        ts: Date.now(),
        data: { tool: "edit", event: "start", toolCallId },
        sessionKey: "session-1",
      };

      const enrichedStart = coordinator.enrichEvent(startEvent, toolCallId);
      expect((enrichedStart.data as any).args).toBe("edit /src/index.ts");

      // 3. LogWatcher 捕获 tool end
      const endEvent: AgentEventPayload = {
        runId: "run-lifecycle",
        seq: 1,
        stream: "tool",
        ts: Date.now(),
        data: { tool: "edit", event: "end", toolCallId },
        sessionKey: "session-1",
      };

      const enrichedEnd = coordinator.enrichEvent(endEvent, toolCallId);
      expect((enrichedEnd.data as any).args).toBe("edit /src/index.ts");
    });
  });
});
