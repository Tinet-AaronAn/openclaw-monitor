import type { Run, AgentEventPayload } from './types.js';

export class RunTracker {
  private runs: Map<string, Run> = new Map();
  private events: AgentEventPayload[] = [];
  private maxEvents: number;

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }

  processEvent(event: AgentEventPayload): Run {
    // Add to events array
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Get or create run
    let run = this.runs.get(event.runId);

    if (!run) {
      run = {
        runId: event.runId,
        sessionKey: event.sessionKey,
        status: 'running',
        startedAt: event.ts,
        eventCount: 0,
        lastEvent: event,
      };
      this.runs.set(event.runId, run);
    }

    // Update run
    run.eventCount++;
    run.lastEvent = event;

    // Check for lifecycle events to update status
    if (event.stream === 'lifecycle') {
      const lifecycleEvent = event.data as { event?: string };
      if (lifecycleEvent.event === 'run_completed') {
        run.status = 'completed';
        run.completedAt = event.ts;
      } else if (lifecycleEvent.event === 'run_failed') {
        run.status = 'failed';
        run.completedAt = event.ts;
      } else if (lifecycleEvent.event === 'run_aborted') {
        run.status = 'aborted';
        run.completedAt = event.ts;
      }
    }

    return run;
  }

  getRuns(): Map<string, Run> {
    return new Map(this.runs);
  }

  getRun(runId: string): Run | undefined {
    return this.runs.get(runId);
  }

  getEvents(): AgentEventPayload[] {
    return [...this.events];
  }

  getEventsForRun(runId: string): AgentEventPayload[] {
    return this.events.filter((e) => e.runId === runId);
  }

  getEventsForSession(sessionKey: string): AgentEventPayload[] {
    return this.events.filter((e) => e.sessionKey === sessionKey);
  }

  getActiveRuns(): Run[] {
    return Array.from(this.runs.values()).filter((r) => r.status === 'running');
  }

  getRecentRuns(limit: number = 50): Run[] {
    return Array.from(this.runs.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [runId, run] of this.runs.entries()) {
      if (run.completedAt && now - run.completedAt > maxAge) {
        this.runs.delete(runId);
      }
    }
  }
}
