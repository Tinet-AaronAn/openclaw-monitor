/**
 * API 端点集成测试
 *
 * 测试所有 HTTP API 端点
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import express, { Application } from "express";
import { createServer, Server } from "http";
import request from "supertest";

// 创建测试用的 express 应用
function createTestApp(): {
  app: Application;
  server: Server;
  sessionsStore: Map<string, any>;
  runTracker: any;
} {
  const app = express();
  const server = createServer(app);
  const sessionsStore = new Map<string, any>();
  const runTracker = {
    runs: new Map(),
    events: [],
    processEvent: vi.fn((event: any) => {
      const run = {
        runId: event.runId,
        status: "running",
        startedAt: event.ts,
        eventCount: 1,
      };
      runTracker.runs.set(event.runId, run);
      runTracker.events.push(event);
      return run;
    }),
    getRuns: () => runTracker.runs,
    getEvents: () => runTracker.events,
    getRun: (id: string) => runTracker.runs.get(id),
    getRecentRuns: (limit: number) =>
      Array.from(runTracker.runs.values()).slice(0, limit),
    getEventsForRun: (runId: string) =>
      runTracker.events.filter((e: any) => e.runId === runId),
  };

  app.use(express.json());

  // CORS
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Sessions API
  app.get("/api/sessions", (_req, res) => {
    const sessions = Array.from(sessionsStore.entries()).map(
      ([key, entry]) => ({
        sessionKey: key,
        ...entry,
      }),
    );
    res.json(sessions);
  });

  app.get("/api/sessions/:sessionKey", (req, res) => {
    const entry = sessionsStore.get(req.params.sessionKey);
    if (!entry) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ sessionKey: req.params.sessionKey, ...entry });
  });

  // Runs API
  app.get("/api/runs", (_req, res) => {
    const runs = runTracker.getRecentRuns(50);
    res.json(runs);
  });

  app.get("/api/runs/:runId", (req, res) => {
    const run = runTracker.getRun(req.params.runId);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json(run);
  });

  app.get("/api/runs/:runId/events", (req, res) => {
    const events = runTracker.getEventsForRun(req.params.runId);
    res.json(events);
  });

  // Events API
  app.get("/api/events", (req, res) => {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 100;
    const events = runTracker.getEvents().slice(-limit);
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const event = req.body;
    runTracker.processEvent(event);
    res.json({ status: "ok", eventId: `${event.runId}-${event.seq}` });
  });

  // State API
  app.get("/api/state", (_req, res) => {
    const state = {
      sessions: Array.from(sessionsStore.entries()).map(([k, v]) => ({
        sessionKey: k,
        ...v,
      })),
      runs: Array.from(runTracker.getRuns().values()),
      events: runTracker.getEvents().slice(-100),
      connectedClients: 0,
      startedAt: Date.now(),
    };
    res.json(state);
  });

  return { app, server, sessionsStore, runTracker };
}

describe("API Endpoints", () => {
  let app: Application;
  let server: Server;
  let sessionsStore: Map<string, any>;
  let runTracker: any;

  beforeAll(() => {
    const testApp = createTestApp();
    app = testApp.app;
    server = testApp.server;
    sessionsStore = testApp.sessionsStore;
    runTracker = testApp.runTracker;
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    sessionsStore.clear();
    runTracker.runs.clear();
    runTracker.events = [];
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("GET /api/state", () => {
    it("should return complete monitor state", async () => {
      const response = await request(app).get("/api/state");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("sessions");
      expect(response.body).toHaveProperty("runs");
      expect(response.body).toHaveProperty("events");
      expect(response.body).toHaveProperty("connectedClients");
      expect(response.body).toHaveProperty("startedAt");
    });

    it("should include sessions from store", async () => {
      sessionsStore.set("test-session", {
        sessionId: "test-session",
        updatedAt: Date.now(),
        model: "zai/glm-5",
      });

      const response = await request(app).get("/api/state");

      expect(response.body.sessions.length).toBe(1);
      expect(response.body.sessions[0].sessionKey).toBe("test-session");
    });
  });

  describe("GET /api/sessions", () => {
    it("should return empty array when no sessions", async () => {
      const response = await request(app).get("/api/sessions");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return all sessions", async () => {
      sessionsStore.set("session-1", {
        sessionId: "session-1",
        updatedAt: Date.now(),
      });
      sessionsStore.set("session-2", {
        sessionId: "session-2",
        updatedAt: Date.now(),
      });

      const response = await request(app).get("/api/sessions");

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  describe("GET /api/sessions/:sessionKey", () => {
    it("should return 404 for non-existent session", async () => {
      const response = await request(app).get("/api/sessions/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Session not found");
    });

    it("should return session details", async () => {
      sessionsStore.set("test-session", {
        sessionId: "test-session",
        updatedAt: Date.now(),
        model: "zai/glm-5",
      });

      const response = await request(app).get("/api/sessions/test-session");

      expect(response.status).toBe(200);
      expect(response.body.sessionKey).toBe("test-session");
      expect(response.body.model).toBe("zai/glm-5");
    });
  });

  describe("GET /api/runs", () => {
    it("should return empty array when no runs", async () => {
      const response = await request(app).get("/api/runs");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return recent runs", async () => {
      runTracker.runs.set("run-1", { runId: "run-1", status: "running" });
      runTracker.runs.set("run-2", { runId: "run-2", status: "completed" });

      const response = await request(app).get("/api/runs");

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  describe("GET /api/runs/:runId", () => {
    it("should return 404 for non-existent run", async () => {
      const response = await request(app).get("/api/runs/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Run not found");
    });

    it("should return run details", async () => {
      runTracker.runs.set("test-run", {
        runId: "test-run",
        status: "running",
        startedAt: Date.now(),
        eventCount: 5,
      });

      const response = await request(app).get("/api/runs/test-run");

      expect(response.status).toBe(200);
      expect(response.body.runId).toBe("test-run");
    });
  });

  describe("GET /api/runs/:runId/events", () => {
    it("should return events for a specific run", async () => {
      runTracker.events = [
        { runId: "run-1", seq: 0, stream: "tool", data: {} },
        { runId: "run-1", seq: 1, stream: "assistant", data: {} },
        { runId: "run-2", seq: 0, stream: "tool", data: {} },
      ];

      const response = await request(app).get("/api/runs/run-1/events");

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every((e: any) => e.runId === "run-1")).toBe(true);
    });
  });

  describe("GET /api/events", () => {
    it("should return all events", async () => {
      runTracker.events = [
        { runId: "run-1", seq: 0, stream: "tool", data: {} },
        { runId: "run-2", seq: 0, stream: "tool", data: {} },
      ];

      const response = await request(app).get("/api/events");

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 200; i++) {
        runTracker.events.push({
          runId: `run-${i}`,
          seq: 0,
          stream: "tool",
          data: {},
        });
      }

      const response = await request(app).get("/api/events?limit=10");

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(10);
    });
  });

  describe("POST /api/events", () => {
    it("should accept and process events", async () => {
      const event = {
        runId: "new-run",
        seq: 0,
        stream: "tool" as const,
        ts: Date.now(),
        data: { tool: "read", event: "start" },
      };

      const response = await request(app).post("/api/events").send(event);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.eventId).toBe("new-run-0");
    });

    it("should store events in tracker", async () => {
      const event = {
        runId: "stored-run",
        seq: 0,
        stream: "tool" as const,
        ts: Date.now(),
        data: { tool: "read", event: "start" },
      };

      await request(app).post("/api/events").send(event);

      expect(runTracker.events.length).toBe(1);
      expect(runTracker.events[0].runId).toBe("stored-run");
    });
  });

  describe("CORS headers", () => {
    it("should include CORS headers", async () => {
      const response = await request(app).get("/api/state");

      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });
  });
});
