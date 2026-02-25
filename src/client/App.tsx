import { useState } from 'react';
import { useMonitor } from './hooks/useMonitor';
import { SessionList } from './components/SessionList';
import { RunList } from './components/RunList';
import { EventList } from './components/EventList';
import { StatCards } from './components/StatCards';

export function App() {
  const { state, connected } = useMonitor();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  // 过滤出选中 session 的 runs
  const filteredRuns = selectedSession
    ? state.runs.filter(r => r.sessionKey === selectedSession)
    : state.runs;

  // 过滤出选中 run 的 events
  const filteredEvents = selectedRun
    ? state.events.filter(e => e.runId === selectedRun)
    : [];

  const activeRuns = state.runs.filter(r => r.status === 'running').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🦞</div>
            <h1 className="text-xl font-bold text-slate-900">OpenClaw Monitor</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-slate-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-slate-500">
              {activeRuns} active run{activeRuns !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* 统计卡片 */}
        <StatCards
          sessions={state.sessions.length}
          runs={state.runs.length}
          events={state.events.length}
          activeRuns={activeRuns}
        />

        {/* 面包屑导航 */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setSelectedSession(null);
              setSelectedRun(null);
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            All Sessions
          </button>
          {selectedSession && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-blue-600 hover:text-blue-700"
              >
                {selectedSession}
              </button>
            </>
          )}
          {selectedRun && (
            <>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600">{selectedRun}</span>
            </>
          )}
        </div>

        {/* 三级视图 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session 列表 */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">
                  Sessions ({state.sessions.length})
                </h2>
              </div>
              <SessionList
                sessions={state.sessions}
                runs={state.runs}
                selectedSession={selectedSession}
                onSelect={(sessionKey) => {
                  setSelectedSession(sessionKey);
                  setSelectedRun(null);
                }}
              />
            </div>
          </div>

          {/* Run 列表 */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">
                  Runs {selectedSession ? `(${filteredRuns.length})` : `(${state.runs.length})`}
                </h2>
              </div>
              <RunList
                runs={selectedSession ? filteredRuns : state.runs}
                selectedRun={selectedRun}
                onSelect={(runId) => setSelectedRun(runId)}
              />
            </div>
          </div>

          {/* Event 列表 */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">
                  Events {selectedRun ? `(${filteredEvents.length})` : ''}
                </h2>
              </div>
              <EventList
                events={selectedRun ? filteredEvents : state.events.slice(-20).reverse()}
                selectedRun={selectedRun}
              />
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        {!selectedSession && (
          <div className="mt-4 text-center text-sm text-slate-500">
            💡 点击 Session 查看 Runs，点击 Run 查看详细 Events
          </div>
        )}
      </main>
    </div>
  );
}
