import type { Session } from '../types';
import { formatDistanceToNow } from 'date-fns';

type SessionsViewProps = {
  sessions: Session[];
};

export function SessionsView({ sessions }: SessionsViewProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No sessions found
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
      {sessions.map((session) => (
        <div key={session.sessionKey} className="p-4 hover:bg-slate-50">
          <div className="flex items-start justify-between mb-2">
            <div className="font-mono text-sm text-slate-900">
              {session.sessionKey}
            </div>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
            </span>
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            {session.channel && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Channel:</span>
                <span>{session.channel}</span>
              </div>
            )}
            {session.model && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Model:</span>
                <span>{session.model}</span>
              </div>
            )}
            {session.totalTokens !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Tokens:</span>
                <span>{session.totalTokens.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
