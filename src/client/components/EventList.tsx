import type { AgentEventPayload } from "../types";

type EventListProps = {
  events: AgentEventPayload[];
  selectedRun: string | null;
};

// 配对事件类型
type PairedEvent = {
  tool: string;
  startTime: number;
  endTime?: number;
  startData?: Record<string, unknown>;
  endData?: Record<string, unknown>;
  status: "running" | "completed";
};

// Tool 类型图标和颜色
const toolConfig: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  exec: {
    icon: "⚡",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50 border-yellow-300",
  },
  read: {
    icon: "📖",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-300",
  },
  write: {
    icon: "✏️",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-300",
  },
  process: {
    icon: "⚙️",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-300",
  },
  message: {
    icon: "💬",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-300",
  },
  default: {
    icon: "🔧",
    color: "text-slate-700",
    bgColor: "bg-slate-50 border-slate-300",
  },
};

// 格式化北京时间（只显示时分秒）
function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// 计算持续时间
function formatDuration(start: number, end?: number): string {
  if (!end) return "...";
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// 配对事件
function pairEvents(events: AgentEventPayload[]): PairedEvent[] {
  const pairs: Map<string, PairedEvent> = new Map();
  const result: PairedEvent[] = [];

  for (const event of events) {
    if (event.stream !== "tool") continue;

    const tool = event.data.tool as string;
    const eventType = event.data.event as string;
    const key = `${event.runId}-${tool}`;

    if (eventType === "start") {
      const pair: PairedEvent = {
        tool,
        startTime: event.ts,
        startData: event.data,
        status: "running",
      };
      pairs.set(key, pair);
      result.push(pair);
    } else if (eventType === "end") {
      const pair = pairs.get(key);
      if (pair) {
        pair.endTime = event.ts;
        pair.endData = event.data;
        pair.status = "completed";
      }
    }
  }

  return result;
}

// 获取工具命令详情
function getToolDetails(data: Record<string, unknown>): string {
  // 优先使用已格式化的 args 字符串
  if (data.args && typeof data.args === "string") {
    return data.args;
  }

  const tool = data.tool as string;

  // 从 rawArgs 获取详细信息
  const rawArgs = data.rawArgs as Record<string, unknown> | undefined;

  switch (tool) {
    case "exec": {
      if (rawArgs?.command) return `$ ${rawArgs.command}`;
      return "";
    }
    case "read": {
      if (rawArgs?.file) return `📄 ${rawArgs.file}`;
      return "";
    }
    case "write": {
      if (rawArgs?.file) return `📝 ${rawArgs.file}`;
      return "";
    }
    case "process": {
      if (rawArgs?.action) return `⚡ ${rawArgs.action}`;
      return "";
    }
    default:
      return "";
  }
}

export function EventList({ events, selectedRun }: EventListProps) {
  if (!selectedRun) {
    return (
      <div className="p-4 text-center text-slate-500">
        <div className="text-4xl mb-2">👈</div>
        <p>选择 Run 查看 Events</p>
      </div>
    );
  }

  if (events.length === 0) {
    return <div className="p-4 text-center text-slate-500">暂无事件</div>;
  }

  const pairedEvents = pairEvents(events);

  return (
    <div className="max-h-[500px] overflow-y-auto p-3 space-y-2">
      {pairedEvents.map((pair, index) => {
        const config = toolConfig[pair.tool] || toolConfig.default;

        return (
          <div
            key={`${pair.tool}-${index}`}
            className={`border-l-4 pl-3 pr-3 py-2 rounded-r ${config.bgColor}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className={`font-bold ${config.color}`}>{pair.tool}</span>
                {pair.status === "running" ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    运行中
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                    ✓ 完成
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {formatTime(pair.startTime)}
                {pair.endTime && ` → ${formatTime(pair.endTime)}`}
              </span>
            </div>

            <div className="text-xs text-slate-600 bg-white bg-opacity-60 p-2 rounded font-mono">
              {getToolDetails(pair.startData || {})}
            </div>

            {pair.status === "completed" && (
              <div className="text-xs text-slate-400 mt-1">
                耗时: {formatDuration(pair.startTime, pair.endTime)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
