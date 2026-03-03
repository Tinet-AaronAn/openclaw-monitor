import { useEffect, useState, useCallback, useRef } from 'react';
import type { MonitorState, WSMessage } from '../types';

const WS_URL = 'ws://localhost:3012';
const API_URL = 'http://localhost:3011';

export function useMonitor() {
  const [state, setState] = useState<MonitorState>({
    sessions: [],
    runs: [],
    events: [],
    connectedClients: 0,
    startedAt: Date.now(),
  });
  const [connected, setConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/state`);
      const data = await response.json();
      setState(data);
    } catch (error) {
      console.error('Failed to fetch state:', error);
    }
  }, []);

  // 只在 WebSocket 断开时启用 HTTP 轮询
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    fetchState();
    intervalRef.current = setInterval(fetchState, 5000);
  }, [fetchState]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // 初始获取一次数据
    fetchState();

    // 启动轮询作为备用
    startPolling();

    return () => {
      stopPolling();
    };
  }, [fetchState, startPolling, stopPolling]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      // 连接成功后停止 HTTP 轮询，避免数据竞争
      stopPolling();
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      // 断开后恢复 HTTP 轮询
      startPolling();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'state':
            setState(message.payload);
            break;

          case 'event':
            setState((prev) => ({
              ...prev,
              events: [...prev.events.slice(-99), message.payload],
            }));
            break;

          case 'run_started': {
            const newRun = message.payload;
            setState((prev) => {
              // 去重：避免重复添加同一个 run
              const exists = prev.runs.some(r => r.runId === newRun.runId);
              if (exists) {
                return prev;
              }
              return {
                ...prev,
                runs: [newRun, ...prev.runs.slice(0, 49)],
              };
            });
            break;
          }

          case 'run_completed':
            setState((prev) => ({
              ...prev,
              runs: prev.runs.map((run) =>
                run.runId === message.payload.runId ? message.payload : run
              ),
            }));
            break;

          case 'session_updated':
            setState((prev) => {
              const { sessionKey, entry } = message.payload;
              const existing = prev.sessions.find((s) => s.sessionKey === sessionKey);
              if (existing) {
                return {
                  ...prev,
                  sessions: prev.sessions.map((s) =>
                    s.sessionKey === sessionKey ? { ...entry, sessionKey } : s
                  ),
                };
              }
              return {
                ...prev,
                sessions: [...prev.sessions, { ...entry, sessionKey }],
              };
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [startPolling, stopPolling]);

  return { state, connected };
}
