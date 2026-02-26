import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenClawLogWatcher } from '../src/server/log-watcher.js';
import type { AgentEventPayload } from '../src/server/types.js';

describe('OpenClawLogWatcher', () => {
  let watcher: OpenClawLogWatcher;
  let capturedEvents: AgentEventPayload[];

  beforeEach(() => {
    watcher = new OpenClawLogWatcher();
    capturedEvents = [];
    watcher.setEventCallback((event) => {
      capturedEvents.push(event);
    });
  });

  describe('parseRunDone', () => {
    it('should emit run_completed event for normal completion', () => {
      // 模拟日志行
      const logLine = JSON.stringify({
        "1": "embedded run done: runId=abc123 sessionId=def456 durationMs=5000 aborted=false",
        "time": "2026-02-26T01:00:00.000Z"
      });

      // 先设置 runId -> sessionId 映射（模拟 run start）
      const startLogLine = JSON.stringify({
        "1": "embedded run start: runId=abc123 sessionId=def456 provider=zai model=glm-5",
        "time": "2026-02-26T00:59:55.000Z"
      });

      // 手动触发解析（绕过文件读取）
      // @ts-ignore - 访问私有方法进行测试
      watcher['parseLogLine'](startLogLine);
      // @ts-ignore
      watcher['parseLogLine'](logLine);

      // 验证 lifecycle 事件
      const lifecycleEvents = capturedEvents.filter(e => e.stream === 'lifecycle');
      expect(lifecycleEvents.length).toBe(2); // run_started + run_completed
      
      const completedEvent = lifecycleEvents.find(e => e.data.event === 'run_completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.runId).toBe('abc123');
      expect(completedEvent?.data.durationMs).toBe(5000);
    });

    it('should emit run_aborted event when aborted=true', () => {
      const startLogLine = JSON.stringify({
        "1": "embedded run start: runId=xyz789 sessionId=uvw123 provider=zai model=glm-5",
        "time": "2026-02-26T01:00:00.000Z"
      });

      const abortLogLine = JSON.stringify({
        "1": "embedded run done: runId=xyz789 sessionId=uvw123 durationMs=1000 aborted=true",
        "time": "2026-02-26T01:00:01.000Z"
      });

      // @ts-ignore
      watcher['parseLogLine'](startLogLine);
      // @ts-ignore
      watcher['parseLogLine'](abortLogLine);

      const lifecycleEvents = capturedEvents.filter(e => e.stream === 'lifecycle');
      const abortedEvent = lifecycleEvents.find(e => e.data.event === 'run_aborted');
      
      expect(abortedEvent).toBeDefined();
      expect(abortedEvent?.runId).toBe('xyz789');
    });
  });

  describe('parseRunStart', () => {
    it('should emit run_started event', () => {
      const logLine = JSON.stringify({
        "1": "embedded run start: runId=start123 sessionId=session456 provider=zai model=glm-5 thinking=low",
        "time": "2026-02-26T01:00:00.000Z"
      });

      // @ts-ignore
      watcher['parseLogLine'](logLine);

      const lifecycleEvents = capturedEvents.filter(e => e.stream === 'lifecycle');
      expect(lifecycleEvents.length).toBe(1);
      expect(lifecycleEvents[0].data.event).toBe('run_started');
      expect(lifecycleEvents[0].runId).toBe('start123');
    });

    it('should map runId to sessionId', () => {
      const logLine = JSON.stringify({
        "1": "embedded run start: runId=mapRunId sessionId=mapSessionId provider=zai model=glm-5",
        "time": "2026-02-26T01:00:00.000Z"
      });

      // @ts-ignore
      watcher['parseLogLine'](logLine);

      // @ts-ignore - 检查内部映射
      const sessionMap = watcher['runSessionMap'];
      expect(sessionMap.get('mapRunId')).toBe('mapSessionId');
    });
  });

  describe('handleAgentLog - tool events', () => {
    it('should emit tool start event', () => {
      // 先设置 runId 映射
      // @ts-ignore
      watcher['runSessionMap'].set('toolRun', 'toolSession');

      const logLine = JSON.stringify({
        "1": "embedded run tool start: runId=toolRun tool=read toolCallId=call123",
        "time": "2026-02-26T01:00:00.000Z"
      });

      // @ts-ignore
      watcher['parseLogLine'](logLine);

      const toolEvents = capturedEvents.filter(e => e.stream === 'tool');
      expect(toolEvents.length).toBe(1);
      expect(toolEvents[0].data.tool).toBe('read');
      expect(toolEvents[0].data.event).toBe('start');
      expect(toolEvents[0].data.toolCallId).toBe('call123');
    });

    it('should emit tool end event', () => {
      // @ts-ignore
      watcher['runSessionMap'].set('toolRun2', 'toolSession2');

      const logLine = JSON.stringify({
        "1": "embedded run tool end: runId=toolRun2 tool=exec toolCallId=call456",
        "time": "2026-02-26T01:00:01.000Z"
      });

      // @ts-ignore
      watcher['parseLogLine'](logLine);

      const toolEvents = capturedEvents.filter(e => e.stream === 'tool');
      expect(toolEvents.length).toBe(1);
      expect(toolEvents[0].data.tool).toBe('exec');
      expect(toolEvents[0].data.event).toBe('end');
    });
  });

  describe('Integration: full run lifecycle', () => {
    it('should track complete run from start to completion', () => {
      // @ts-ignore
      watcher['runSessionMap'].set('fullRun', 'fullSession');

      // Tool start
      // @ts-ignore
      watcher['parseLogLine'](JSON.stringify({
        "1": "embedded run tool start: runId=fullRun tool=read toolCallId=call1",
        "time": "2026-02-26T01:00:00.000Z"
      }));

      // Tool end
      // @ts-ignore
      watcher['parseLogLine'](JSON.stringify({
        "1": "embedded run tool end: runId=fullRun tool=read toolCallId=call1",
        "time": "2026-02-26T01:00:00.100Z"
      }));

      // Run completed
      // @ts-ignore
      watcher['parseLogLine'](JSON.stringify({
        "1": "embedded run done: runId=fullRun sessionId=fullSession durationMs=500 aborted=false",
        "time": "2026-02-26T01:00:01.000Z"
      }));

      // 验证事件顺序
      expect(capturedEvents.length).toBe(3);
      expect(capturedEvents[0].stream).toBe('tool');
      expect(capturedEvents[1].stream).toBe('tool');
      expect(capturedEvents[2].stream).toBe('lifecycle');
      expect(capturedEvents[2].data.event).toBe('run_completed');
    });
  });
});
