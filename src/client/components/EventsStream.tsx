import type { AgentEventPayload } from '../types';
import { format } from 'date-fns';

type EventsStreamProps = {
  events: AgentEventPayload[];
};

const streamColors = {
  lifecycle: 'border-l-blue-500 bg-blue-50',
  tool: 'border-l-purple-500 bg-purple-50',
  assistant: 'border-l-green-500 bg-green-50',
  error: 'border-l-red-500 bg-red-50',
};

export function EventsStream({ events }: EventsStreamProps) {
  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No events yet
      </div>
    );
  }

  const reversedEvents = [...events].reverse();

  return (
    <div className="max-h-[600px] overflow-y-auto">
      <div className="space-y-2 p-2">
        {reversedEvents.map((event) => (
          <div
            key={`${event.runId}-${event.seq}`}
            className={`border-l-4 pl-3 py-2 rounded-r ${
              streamColors[event.stream as keyof typeof streamColors] ||
              'border-l-slate-500 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">
                {event.stream}
              </span>
              <span className="text-xs text-slate-500">
                {format(event.ts, 'HH:mm:ss')}
              </span>
            </div>
            <div className="text-xs text-slate-600 font-mono">
              {JSON.stringify(event.data).slice(0, 100)}
              {JSON.stringify(event.data).length > 100 && '...'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
