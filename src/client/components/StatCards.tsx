type StatCardsProps = {
  sessions: number;
  runs: number;
  events: number;
  activeRuns: number;
};

export function StatCards({ sessions, runs, events, activeRuns }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Sessions</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{sessions}</p>
          </div>
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-50 text-green-600">
            📝
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Runs</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{runs}</p>
          </div>
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-50 text-blue-600">
            ▶️
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Active Runs</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{activeRuns}</p>
          </div>
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-yellow-50 text-yellow-600">
            🔥
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Events</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{events}</p>
          </div>
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-50 text-purple-600">
            📊
          </div>
        </div>
      </div>
    </div>
  );
}
