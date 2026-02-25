export type AgentEventStream = 'lifecycle' | 'tool' | 'assistant' | 'error' | string;

export type AgentEventPayload = {
  runId: string;
  seq: number;
  stream: AgentEventStream;
  ts: number;
  data: Record<string, unknown>;
  sessionKey?: string;
};

export type RunStatus = 'running' | 'completed' | 'failed' | 'aborted';

export type Run = {
  runId: string;
  sessionKey?: string;
  status: RunStatus;
  startedAt: number;
  completedAt?: number;
  eventCount: number;
  lastEvent?: AgentEventPayload;
};

export type SessionEntry = {
  sessionId: string;
  updatedAt: number;
  sessionFile?: string;
  spawnedBy?: string;
  spawnDepth?: number;
  chatType?: string;
  thinkingLevel?: string;
  verboseLevel?: string;
  reasoningLevel?: string;
  elevatedLevel?: string;
  modelProvider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheRead?: number;
  cacheWrite?: number;
  label?: string;
  displayName?: string;
  channel?: string;
  groupId?: string;
  origin?: {
    label?: string;
    provider?: string;
    surface?: string;
    chatType?: string;
    from?: string;
    to?: string;
  };
  lastChannel?: string;
  lastTo?: string;
};

export type Session = SessionEntry & {
  sessionKey: string;
};

export type MonitorState = {
  sessions: Session[];
  runs: Run[];
  events: AgentEventPayload[];
  connectedClients: number;
  startedAt: number;
};

export type WSMessage =
  | { type: 'state'; payload: MonitorState }
  | { type: 'event'; payload: AgentEventPayload }
  | { type: 'run_started'; payload: Run }
  | { type: 'run_completed'; payload: Run }
  | { type: 'session_updated'; payload: { sessionKey: string; entry: SessionEntry } };
