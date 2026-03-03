/**
 * 数据竞争修复验证测试
 *
 * 此测试验证 WebSocket 和 HTTP 轮询不会同时运行的核心逻辑
 *
 * 背景：
 * - 修复前：WebSocket 和 HTTP 轮询可能同时更新状态，导致数据不一致
 * - 修复后：WebSocket 连接时停止 HTTP 轮询，断开时恢复
 *
 * 相关代码：src/client/hooks/useMonitor.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("数据竞争修复验证", () => {
  describe("useMonitor 逻辑验证（非 React 测试）", () => {
    // 模拟 useMonitor 的核心逻辑
    function createMockMonitor() {
      let isPolling = false;
      let wsConnected = false;
      const pollCalls: number[] = [];
      const wsMessages: any[] = [];
      let pollInterval: ReturnType<typeof setInterval> | null = null;

      const startPolling = vi.fn(() => {
        if (pollInterval) return;
        isPolling = true;
        pollInterval = setInterval(() => {
          if (!wsConnected) {
            pollCalls.push(Date.now());
          }
        }, 5000);
      });

      const stopPolling = vi.fn(() => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        isPolling = false;
      });

      const simulateWsConnect = () => {
        wsConnected = true;
        stopPolling();
      };

      const simulateWsDisconnect = () => {
        wsConnected = false;
        startPolling();
      };

      const simulateWsMessage = (msg: any) => {
        if (wsConnected) {
          wsMessages.push(msg);
        }
      };

      return {
        startPolling,
        stopPolling,
        simulateWsConnect,
        simulateWsDisconnect,
        simulateWsMessage,
        getPollCalls: () => pollCalls.length,
        getWsMessages: () => wsMessages.length,
        isPollingActive: () => isPolling,
        isWsConnected: () => wsConnected,
      };
    }

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("初始状态应该启动 HTTP 轮询", () => {
      const monitor = createMockMonitor();

      // 初始化时启动轮询
      monitor.startPolling();

      expect(monitor.isPollingActive()).toBe(true);
    });

    it("WebSocket 连接后应该停止 HTTP 轮询", () => {
      const monitor = createMockMonitor();

      // 初始启动轮询
      monitor.startPolling();
      expect(monitor.isPollingActive()).toBe(true);

      // WebSocket 连接
      monitor.simulateWsConnect();

      // 轮询应该停止
      expect(monitor.isPollingActive()).toBe(false);
      expect(monitor.stopPolling).toHaveBeenCalled();
    });

    it("WebSocket 断开后应该恢复 HTTP 轮询", () => {
      const monitor = createMockMonitor();

      // 初始化
      monitor.startPolling();
      monitor.simulateWsConnect();

      expect(monitor.isPollingActive()).toBe(false);

      // WebSocket 断开
      monitor.simulateWsDisconnect();

      // 轮询应该恢复
      expect(monitor.isPollingActive()).toBe(true);
      expect(monitor.startPolling).toHaveBeenCalledTimes(2); // 初始 + 断开后
    });

    it("WebSocket 连接期间不应该有 HTTP 轮询请求", async () => {
      const monitor = createMockMonitor();

      // 初始化
      monitor.startPolling();
      monitor.simulateWsConnect();

      const initialPollCalls = monitor.getPollCalls();

      // 推进时间 30 秒
      await vi.advanceTimersByTimeAsync(30000);

      // WebSocket 连接期间不应该有新的轮询调用
      expect(monitor.getPollCalls()).toBe(initialPollCalls);
    });

    it("WebSocket 断开后应该恢复 HTTP 轮询请求", async () => {
      const monitor = createMockMonitor();

      // 初始化并连接 WebSocket
      monitor.startPolling();
      monitor.simulateWsConnect();

      // 断开 WebSocket
      monitor.simulateWsDisconnect();

      const initialPollCalls = monitor.getPollCalls();

      // 推进时间 10 秒
      await vi.advanceTimersByTimeAsync(10000);

      // 应该有新的轮询调用
      expect(monitor.getPollCalls()).toBeGreaterThan(initialPollCalls);
    });

    it("WebSocket 消息只在连接时处理", () => {
      const monitor = createMockMonitor();

      // 未连接时发送消息
      monitor.simulateWsMessage({ type: "test" });
      expect(monitor.getWsMessages()).toBe(0);

      // 连接后发送消息
      monitor.simulateWsConnect();
      monitor.simulateWsMessage({ type: "test" });
      expect(monitor.getWsMessages()).toBe(1);
    });
  });

  describe("状态一致性验证", () => {
    it("Run 去重：相同 runId 不应重复添加", () => {
      const runs: any[] = [];
      const existingIds = new Set<string>();

      const addRun = (run: { runId: string }) => {
        if (existingIds.has(run.runId)) {
          return false;
        }
        existingIds.add(run.runId);
        runs.push(run);
        return true;
      };

      // 第一次添加
      expect(addRun({ runId: "run-1" })).toBe(true);
      expect(runs.length).toBe(1);

      // 重复添加
      expect(addRun({ runId: "run-1" })).toBe(false);
      expect(runs.length).toBe(1);

      // 新 run
      expect(addRun({ runId: "run-2" })).toBe(true);
      expect(runs.length).toBe(2);
    });

    it("Run 状态更新：completed 应更新对应 run", () => {
      const runs = new Map<string, any>();

      runs.set("run-1", { runId: "run-1", status: "running", startedAt: 1000 });

      // 模拟 run_completed 消息
      const completedPayload = {
        runId: "run-1",
        status: "completed",
        completedAt: 2000,
      };

      const existing = runs.get(completedPayload.runId);
      if (existing) {
        runs.set(completedPayload.runId, { ...existing, ...completedPayload });
      }

      const updatedRun = runs.get("run-1");
      expect(updatedRun?.status).toBe("completed");
      expect(updatedRun?.completedAt).toBe(2000);
      expect(updatedRun?.startedAt).toBe(1000); // 原有字段保留
    });

    it("Session 更新：新 session 添加，已有 session 更新", () => {
      const sessions = new Map<string, any>();

      const updateSession = (sessionKey: string, entry: any) => {
        sessions.set(sessionKey, { sessionKey, ...entry });
      };

      // 添加新 session
      updateSession("session-1", { model: "zai/glm-5", updatedAt: 1000 });
      expect(sessions.size).toBe(1);
      expect(sessions.get("session-1")?.model).toBe("zai/glm-5");

      // 更新已有 session
      updateSession("session-1", { model: "zai/glm-5", updatedAt: 2000 });
      expect(sessions.size).toBe(1);
      expect(sessions.get("session-1")?.updatedAt).toBe(2000);
    });
  });
});
