import type { Run } from '../types';
import { formatDistanceToNow } from 'date-fns';

type RunsViewProps = {
  runs: Run[];
};

const statusColors = {
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  aborted: 'bg-yellow-100 text-yellow-800',
};

export function RunsView({ runs }: RunsViewProps) {
  if (runs.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No runs found
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
      {runs.map((run) => (
        <div key={run.runId} className="p-4 hover:bg-slate-50">
          <div className="flex items-start justify-between mb-2">
            <div className="font-mono text-xs text-slate-600">
              {run.runId.slice(0, 12)}...
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[run.status]}`}>
              {run.status}
            </span>
          </div>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Started:</span>
              <span>{formatDistanceToNow(run.startedAt, { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Events:</span>
              <span>{run.eventCount}</span>
            </div>
            {run.sessionKey && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Session:</span>
                <span className="font-mono text-xs">{run.sessionKey.slice(0, 16)}...</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
