import type { Run } from '../types';
import { formatDistanceToNow } from 'date-fns';

type RunListProps = {
  runs: Run[];
  selectedRun: string | null;
  onSelect: (runId: string) => void;
};

const statusColors = {
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  aborted: 'bg-yellow-100 text-yellow-800',
};

const statusEmoji = {
  running: '▶️',
  completed: '✅',
  failed: '❌',
  aborted: '⚠️',
};

export function RunList({ runs, selectedRun, onSelect }: RunListProps) {
  if (runs.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No runs found
      </div>
    );
  }

  // 按时间倒序排列
  const sortedRuns = [...runs].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
      {sortedRuns.slice(0, 50).map((run) => (
        <button
          key={run.runId}
          onClick={() => onSelect(run.runId)}
          className={`w-full text-left p-4 rounded-lg transition-colors ${
            selectedRun === run.runId
              ? 'bg-blue-50 border-2 border-blue-500'
              : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>{statusEmoji[run.status]}</span>
              <span className="font-mono text-xs text-slate-600">
                {run.runId.slice(-12)}
              </span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[run.status]}`}>
              {run.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">Started:</span>
              <span>{formatDistanceToNow(run.startedAt, { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Events:</span>
              <span className="font-bold text-purple-600">{run.eventCount}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
