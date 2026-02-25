import type { MonitorState } from '../types';
import { StatCard } from './StatCard';
import { SessionsView } from './SessionsView';
import { RunsView } from './RunsView';
import { EventsStream } from './EventsStream';

type DashboardProps = {
  state: MonitorState;
};

export function Dashboard({ state }: DashboardProps) {
  const activeRuns = state.runs.filter((r) => r.status === 'running').length;
  const totalSessions = state.sessions.length;
  const totalEvents = state.events.length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Runs"
          value={activeRuns}
          icon="▶️"
          color="blue"
        />
        <StatCard
          title="Sessions"
          value={totalSessions}
          icon="📝"
          color="green"
        />
        <StatCard
          title="Total Events"
          value={totalEvents}
          icon="📊"
          color="purple"
        />
        <StatCard
          title="Connected Clients"
          value={state.connectedClients}
          icon="🔌"
          color="yellow"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Sessions</h2>
            </div>
            <SessionsView sessions={state.sessions} />
          </div>
        </div>

        {/* Runs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Recent Runs</h2>
            </div>
            <RunsView runs={state.runs} />
          </div>
        </div>

        {/* Events */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Event Stream</h2>
            </div>
            <EventsStream events={state.events} />
          </div>
        </div>
      </div>
    </div>
  );
}
