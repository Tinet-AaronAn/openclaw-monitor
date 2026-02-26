import { describe, it, expect } from 'vitest';
import { RunTracker } from '../src/server/run-tracker.js';
import type { AgentEventPayload } from '../src/server/types.js';

describe('RunTracker', () => {
  it('should create a new run when receiving first event', () => {
    const tracker = new RunTracker();
    const event: AgentEventPayload = {
      runId: 'test-run-1',
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    };

    const run = tracker.processEvent(event);
    
    expect(run.runId).toBe('test-run-1');
    expect(run.status).toBe('running');
    expect(run.eventCount).toBe(1);
  });

  it('should mark run as completed when receiving run_completed event', () => {
    const tracker = new RunTracker();
    const runId = 'test-run-2';
    
    // First event - run starts
    tracker.processEvent({
      runId,
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    });

    // Lifecycle event - run completed
    const completedRun = tracker.processEvent({
      runId,
      seq: 1,
      stream: 'lifecycle',
      ts: Date.now(),
      data: { event: 'run_completed' },
      sessionKey: 'test-session'
    });

    expect(completedRun.status).toBe('completed');
    expect(completedRun.completedAt).toBeDefined();
  });

  it('should mark run as aborted when receiving run_aborted event', () => {
    const tracker = new RunTracker();
    const runId = 'test-run-3';
    
    // First event
    tracker.processEvent({
      runId,
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    });

    // Lifecycle event - run aborted
    const abortedRun = tracker.processEvent({
      runId,
      seq: 1,
      stream: 'lifecycle',
      ts: Date.now(),
      data: { event: 'run_aborted' },
      sessionKey: 'test-session'
    });

    expect(abortedRun.status).toBe('aborted');
    expect(abortedRun.completedAt).toBeDefined();
  });

  it('should mark run as failed when receiving run_failed event', () => {
    const tracker = new RunTracker();
    const runId = 'test-run-4';
    
    // First event
    tracker.processEvent({
      runId,
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    });

    // Lifecycle event - run failed
    const failedRun = tracker.processEvent({
      runId,
      seq: 1,
      stream: 'lifecycle',
      ts: Date.now(),
      data: { event: 'run_failed' },
      sessionKey: 'test-session'
    });

    expect(failedRun.status).toBe('failed');
    expect(failedRun.completedAt).toBeDefined();
  });

  it('should correctly count events', () => {
    const tracker = new RunTracker();
    const runId = 'test-run-5';
    
    // Multiple events
    tracker.processEvent({
      runId,
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    });
    
    tracker.processEvent({
      runId,
      seq: 1,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'end' },
      sessionKey: 'test-session'
    });
    
    tracker.processEvent({
      runId,
      seq: 2,
      stream: 'assistant',
      ts: Date.now(),
      data: { message: 'Done!' },
      sessionKey: 'test-session'
    });

    const run = tracker.getRun(runId);
    expect(run?.eventCount).toBe(3);
  });

  it('should filter active runs correctly', () => {
    const tracker = new RunTracker();
    
    // Running run
    tracker.processEvent({
      runId: 'running-run',
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    });
    
    // Completed run
    tracker.processEvent({
      runId: 'completed-run',
      seq: 0,
      stream: 'tool',
      ts: Date.now(),
      data: { tool: 'read', event: 'start' },
      sessionKey: 'test-session'
    });
    tracker.processEvent({
      runId: 'completed-run',
      seq: 1,
      stream: 'lifecycle',
      ts: Date.now(),
      data: { event: 'run_completed' },
      sessionKey: 'test-session'
    });

    const activeRuns = tracker.getActiveRuns();
    expect(activeRuns.length).toBe(1);
    expect(activeRuns[0].runId).toBe('running-run');
  });
});
