import { useState } from 'react';
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
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  if (runs.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No runs found
      </div>
    );
  }

  // 筛选和排序：active 优先
  const filteredRuns = runs
    .filter(run => !showOnlyActive || run.status === 'running')
    .sort((a, b) => {
      // running 优先
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;
      // 其他按时间排序
      return b.startedAt - a.startedAt;
    });

  const activeCount = runs.filter(r => r.status === 'running').length;

  return (
    <div className="p-4 space-y-2">
      {/* 筛选按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowOnlyActive(!showOnlyActive)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showOnlyActive
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {showOnlyActive ? '✓ Active Only' : 'Show All'}
        </button>
        <div className="text-xs text-slate-500">
          {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''}
          {activeCount > 0 && (
            <span className="ml-2 text-orange-600 font-medium">
              ({activeCount} active 🔥)
            </span>
          )}
        </div>
      </div>

      {/* Run 列表 */}
      <div className="max-h-[500px] overflow-y-auto space-y-2">
        {filteredRuns.slice(0, 50).map((run) => (
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
    </div>
  );
}
