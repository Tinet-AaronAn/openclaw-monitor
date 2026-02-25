// OpenClaw Runtime Types - Based on openclaw source code analysis

export type AgentEventStream = 'lifecycle' | 'tool' | 'assistant' | 'error' | string;

export type AgentEventPayload = {
  runId: string;
  seq: number;
  stream: AgentEventStream;
  ts: number;
  data: Record<string, unknown>;
  sessionKey?: string;
};

export type AgentRunContext = {
  sessionKey?: string;
  verboseLevel?: string;
  isHeartbeat?: boolean;
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
  context?: AgentRunContext;
};

export type SessionScope = 'per-sender' | 'global';

export type SessionOrigin = {
  label?: string;
  provider?: string;
  surface?: string;
  chatType?: string;
  from?: string;
  to?: string;
  accountId?: string;
  threadId?: string | number;
};

export type Session = {
  sessionKey: string;
  sessionId?: string;
  updatedAt?: number;
  chatType?: string;
  model?: string;
  modelProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalTokensFresh?: number;
  contextTokens?: number;
  systemSent?: boolean;
  abortedLastRun?: boolean;
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
  origin?: SessionOrigin;
  lastChannel?: string;
  lastTo?: string;
};

export type MonitorState = {
  sessions: Map<string, SessionEntry>;
  runs: Map<string, Run>;
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
