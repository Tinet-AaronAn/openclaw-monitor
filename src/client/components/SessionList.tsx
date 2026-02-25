import type { Session, Run } from '../types';
import { formatDistanceToNow } from 'date-fns';

type SessionListProps = {
  sessions: Session[];
  runs: Run[];
  selectedSession: string | null;
  onSelect: (sessionKey: string) => void;
};

export function SessionList({ sessions, runs, selectedSession, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    // Demo 模式：如果没有 session，创建一个虚拟的
    const demoSession: Session = {
      sessionKey: 'demo-session',
      sessionId: 'demo-session',
      updatedAt: Date.now(),
      channel: 'webchat',
      model: 'zai/glm-5',
    };

    const demoRuns = runs.filter(r => r.sessionKey === 'demo-session');

    return (
      <div className="p-4 space-y-2">
        <button
          onClick={() => onSelect('demo-session')}
          className={`w-full text-left p-4 rounded-lg transition-colors ${
            selectedSession === 'demo-session'
              ? 'bg-blue-50 border-2 border-blue-500'
              : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-sm font-medium text-slate-900">
              🎯 demo-session
            </div>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(demoSession.updatedAt, { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">Channel:</span>
              <span>{demoSession.channel}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Runs:</span>
              <span className="font-bold text-blue-600">{demoRuns.length}</span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
      {sessions.map((session) => {
        const sessionRuns = runs.filter(r => r.sessionKey === session.sessionKey);
        const activeRuns = sessionRuns.filter(r => r.status === 'running').length;

        return (
          <button
            key={session.sessionKey}
            onClick={() => onSelect(session.sessionKey)}
            className={`w-full text-left p-4 rounded-lg transition-colors ${
              selectedSession === session.sessionKey
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-sm font-medium text-slate-900">
                {session.sessionKey}
              </div>
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              {session.channel && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Channel:</span>
                  <span>{session.channel}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="font-medium">Runs:</span>
                <span className="font-bold text-blue-600">{sessionRuns.length}</span>
              </div>
              {activeRuns > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Active:</span>
                  <span className="font-bold text-orange-600">{activeRuns} 🔥</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
