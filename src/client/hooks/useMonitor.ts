import { useEffect, useState, useCallback } from 'react';
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

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/state`);
      const data = await response.json();
      setState(data);
    } catch (error) {
      console.error('Failed to fetch state:', error);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
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

          case 'run_started':
            setState((prev) => ({
              ...prev,
              runs: [message.payload, ...prev.runs.slice(0, 49)],
            }));
            break;

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
    };
  }, []);

  return { state, connected };
}
