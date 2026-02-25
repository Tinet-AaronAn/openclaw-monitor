import express from 'express';
import { createServer } from 'http';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SessionMonitor } from './session-monitor.js';
import { RunTracker } from './run-tracker.js';
import { MonitorWebSocketServer } from './websocket-server.js';
import { OpenClawLogWatcher } from './log-watcher.js';
import { SessionFileWatcher } from './session-file-watcher.js';
import { EventCoordinator } from './event-coordinator.js';
import { OpenClawCLI } from './openclaw-cli.js';
import type { MonitorState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3011;
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3012;
const SESSIONS_DIR = process.env.OPENCLAW_SESSIONS_DIR || resolve(process.env.HOME!, '.openclaw/sessions');
const ENABLE_LOG_WATCHER = process.env.ENABLE_LOG_WATCHER !== 'false';
const ENABLE_CLI_POLLING = process.env.ENABLE_CLI_POLLING !== 'false';
const CLI_POLL_INTERVAL = parseInt(process.env.CLI_POLL_INTERVAL || '5000', 10);

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Components
const sessionMonitor = new SessionMonitor(SESSIONS_DIR);
const runTracker = new RunTracker(1000);
const wsServer = new MonitorWebSocketServer(WS_PORT);
const logWatcher = new OpenClawLogWatcher();
const sessionFileWatcher = new SessionFileWatcher();
const eventCoordinator = new EventCoordinator();
const openclawCLI = new OpenClawCLI();

// 内存中的 sessions 存储
const sessionsStore = new Map<string, any>();

// API Routes
app.get('/api/sessions', (_req, res) => {
  const sessions = Array.from(sessionsStore.entries()).map(([key, entry]) => ({
    sessionKey: key,
    ...entry,
  }));
  res.json(sessions);
});

app.get('/api/sessions/:sessionKey', (req, res) => {
  const entry = sessionsStore.get(req.params.sessionKey);
  if (!entry) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ sessionKey: req.params.sessionKey, ...entry });
});

app.get('/api/runs', (_req, res) => {
  const runs = runTracker.getRecentRuns(50);
  res.json(runs);
});

app.get('/api/runs/:runId', (req, res) => {
  const run = runTracker.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

app.get('/api/runs/:runId/events', (req, res) => {
  const events = runTracker.getEventsForRun(req.params.runId);
  res.json(events);
});

app.get('/api/events', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const events = runTracker.getEvents().slice(-limit);
  res.json(events);
});

app.get('/api/state', (_req, res) => {
  const state: MonitorState = {
    sessions: sessionsStore,
    runs: runTracker.getRuns(),
    events: runTracker.getEvents().slice(-100),
    connectedClients: wsServer.getConnectedClients(),
    startedAt: Date.now(),
  };
  res.json({
    sessions: Array.from(state.sessions.entries()).map(([k, v]) => ({ sessionKey: k, ...v })),
    runs: Array.from(state.runs.entries()).map(([k, v]) => ({ ...v, runId: k })),
    events: state.events,
    connectedClients: state.connectedClients,
    startedAt: state.startedAt,
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 接收来自桥接脚本的事件
app.post('/api/events', (req, res) => {
  const event = req.body;

  // 处理事件
  runTracker.processEvent(event);

  // 广播给所有客户端
  wsServer.broadcastEvent(event);

  console.log(`[Event] ${event.stream} - Run: ${event.runId.slice(-8)}`);

  res.json({ status: 'ok', eventId: `${event.runId}-${event.seq}` });
});

// Setup session monitor callbacks
sessionMonitor.setUpdateCallback((sessionKey, entry) => {
  sessionsStore.set(sessionKey, entry);
  wsServer.broadcastSessionUpdated(sessionKey, entry);
});

// Setup log watcher callbacks
if (ENABLE_LOG_WATCHER) {
  logWatcher.setEventCallback((event) => {
    // 尝试增强事件（添加工具参数）
    const toolCallId = (event.data as any)?.toolCallId;
    const enrichedEvent = eventCoordinator.enrichEvent(event, toolCallId);
    
    const run = runTracker.processEvent(enrichedEvent);
    wsServer.broadcastEvent(enrichedEvent);

    // 检查是否是新 Run
    if (event.seq === 0 || event.data.event === 'run_started') {
      wsServer.broadcastRunStarted(run);
    }
  });
}

// Setup session file watcher callbacks
sessionFileWatcher.setEventCallback((event) => {
  // 处理工具调用，存储 toolCallId -> 参数映射
  const toolData = event.data as any;
  if (toolData.toolCallId && toolData.rawArgs) {
    eventCoordinator.handleToolCall(
      toolData.toolCallId,
      toolData.tool,
      toolData.rawArgs,
      toolData.args
    );
  }
});

// 定期轮询 OpenClaw CLI 获取 sessions
if (ENABLE_CLI_POLLING) {
  setInterval(async () => {
    try {
      const sessions = await openclawCLI.getSessions();

      // 更新 session 存储
      for (const session of sessions) {
        sessionsStore.set(session.sessionKey, session);
        wsServer.broadcastSessionUpdated(session.sessionKey, session as any);
      }
    } catch (error) {
      console.error('[CLI Polling] Failed:', error);
    }
  }, CLI_POLL_INTERVAL);
}

// 定期清理 event coordinator（防止内存泄漏）
setInterval(() => {
  eventCoordinator.cleanup();
}, 60000); // 每分钟清理一次

// TODO: Integrate with OpenClaw event stream
// For now, we'll use a demo mode that generates sample events
function generateDemoEvents(): void {
  const runId = `run-${Date.now()}`;
  const sessionKey = 'demo-session';

  // Start event
  const startEvent = {
    runId,
    seq: 0,
    stream: 'lifecycle' as const,
    ts: Date.now(),
    data: { event: 'run_started' },
    sessionKey,
  };
  const run = runTracker.processEvent(startEvent);
  wsServer.broadcastRunStarted(run);

  // Tool event
  setTimeout(() => {
    const toolEvent = {
      runId,
      seq: 1,
      stream: 'tool' as const,
      ts: Date.now(),
      data: { tool: 'read', args: { file: 'example.txt' } },
      sessionKey,
    };
    runTracker.processEvent(toolEvent);
    wsServer.broadcastEvent(toolEvent);
  }, 1000);

  // Assistant event
  setTimeout(() => {
    const assistantEvent = {
      runId,
      seq: 2,
      stream: 'assistant' as const,
      ts: Date.now(),
      data: { message: 'Hello, I read the file!' },
      sessionKey,
    };
    runTracker.processEvent(assistantEvent);
    wsServer.broadcastEvent(assistantEvent);
  }, 2000);

  // Complete event
  setTimeout(() => {
    const completeEvent = {
      runId,
      seq: 3,
      stream: 'lifecycle' as const,
      ts: Date.now(),
      data: { event: 'run_completed' },
      sessionKey,
    };
    const completedRun = runTracker.processEvent(completeEvent);
    wsServer.broadcastRunCompleted(completedRun);
  }, 3000);
}

// Start server
async function start(): Promise<void> {
  try {
    await sessionMonitor.start();
    console.log('Session monitor started');

    if (ENABLE_LOG_WATCHER) {
      logWatcher.start();
      console.log('OpenClaw log watcher started');
    }

    // 启动 session file watcher
    sessionFileWatcher.start();
    console.log('Session file watcher started');

    if (ENABLE_CLI_POLLING) {
      console.log(`OpenClaw CLI polling enabled (interval: ${CLI_POLL_INTERVAL}ms)`);
    }

    server.listen(PORT, () => {
      console.log(`Monitor server running at http://localhost:${PORT}`);
      console.log(`WebSocket server running at ws://localhost:${WS_PORT}`);

      // Demo mode - generate events every 5 seconds
      if (process.env.DEMO_MODE === 'true') {
        console.log('Demo mode enabled - generating sample events');
        setInterval(generateDemoEvents, 5000);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  sessionMonitor.stop();
  logWatcher.stop();
  sessionFileWatcher.stop();
  wsServer.close();
  server.close();
  process.exit(0);
});

start();

// CLI Polling
if (ENABLE_CLI_POLLING) {
  const { startCLIPolling } = await import('./index-cli-polling.js');
  startCLIPolling(wsServer, CLI_POLL_INTERVAL);
}

