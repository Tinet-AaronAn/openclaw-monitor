# OpenClaw Agent Runtime 核心概念分析

> 基于 openclaw 源代码（2026.2.21-2）深入分析

## 核心架构

OpenClaw 的 Agent Runtime 采用**事件驱动架构**，核心概念包括：

### 1. Run（运行）

**定义：** 每次对话或任务执行都对应一个 Run。

**特征：**
- 唯一标识：`runId`
- 状态：running | completed | failed | aborted
- 包含上下文信息（sessionKey、verboseLevel 等）
- 跟踪事件数量和最后事件

**生命周期：**
```
started → running → completed/failed/aborted
```

**实现位置：**
- 源码路径：`/src/infra/agent-events.ts`
- 类型定义：`AgentRunContext`

### 2. Session（会话）

**定义：** Session 是对话的持久化单元，跨越多个 Run。

**特征：**
- 唯一标识：`sessionKey`（格式：`channel:chatId` 或 `global`）
- 状态管理：updatedAt、thinkingLevel、verboseLevel 等
- 持久化：存储在 `.session.json` 文件中
- 统计信息：tokens、compactionCount、model 等

**数据结构：**
```typescript
type SessionEntry = {
  sessionId: string;
  updatedAt: number;
  sessionFile?: string;
  spawnedBy?: string;  // Parent session
  spawnDepth?: number; // 0 = main, 1 = sub-agent
  modelProvider?: string;
  model?: string;
  totalTokens?: number;
  // ... more fields
}
```

**存储位置：**
- `~/.openclaw/sessions/*.session.json`

### 3. Event（事件）

**定义：** Agent 执行过程中产生的结构化事件流。

**事件类型：**
- `lifecycle`: 生命周期事件（run_started、run_completed、run_failed）
- `tool`: 工具调用事件（read、write、exec 等）
- `assistant`: 助手回复事件
- `error`: 错误事件

**事件结构：**
```typescript
type AgentEventPayload = {
  runId: string;          // Run ID
  seq: number;            // 序列号（递增）
  stream: AgentEventStream;  // 流类型
  ts: number;             // Unix 时间戳（毫秒）
  data: Record<string, unknown>;  // 事件数据
  sessionKey?: string;    // 会话键
}
```

**实现机制：**
- 事件发射：`emitAgentEvent(event)`
- 事件监听：`onAgentEvent(listener)`
- 运行时上下文：`registerAgentRunContext(runId, context)`

## 数据流

```
┌──────────────────────────────────────────────────┐
│              User Message                        │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│          Session Manager                         │
│  - 加载/创建 Session                             │
│  - 更新 Session 状态                             │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│          Run Tracker                             │
│  - 创建 Run                                      │
│  - 跟踪状态                                      │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│          Event Stream                            │
│  - lifecycle                                     │
│  - tool                                          │
│  - assistant                                     │
│  - error                                         │
└──────────────────────────────────────────────────┘
```

## 关键组件

### 1. SessionMonitor

**职责：**
- 监控 `~/.openclaw/sessions/` 目录
- 读取 `.session.json` 文件
- 监听文件变化（chokidar）
- 发送更新通知

**实现：**
- 文件监听：`chokidar.watch()`
- 文件解析：`JSON.parse()`

### 2. RunTracker

**职责：**
- 跟踪所有 Run 的状态
- 维护事件缓存
- 提供查询接口

**关键方法：**
- `processEvent(event)`: 处理事件并更新 Run
- `getRuns()`: 获取所有 Run
- `getEventsForRun(runId)`: 获取指定 Run 的事件

### 3. MonitorWebSocketServer

**职责：**
- 实时推送监控数据
- 广播事件更新
- 管理客户端连接

**消息类型：**
- `state`: 完整状态
- `event`: 新事件
- `run_started`: Run 开始
- `run_completed`: Run 完成
- `session_updated`: Session 更新

## 监控指标

### Session 级别
- 总会话数
- 活跃会话数
- Token 使用量
- 模型分布

### Run 级别
- 活跃 Run 数
- Run 成功率
- 平均执行时间
- 事件频率

### Event 级别
- 事件流速率
- 事件类型分布
- 错误率

## 扩展性

### 集成方式

**方案 1：文件监听（已实现）**
- 监听 `.session.json` 文件变化
- 优点：无侵入性
- 缺点：延迟高，无法获取实时事件

**方案 2：WebSocket 集成（推荐）**
- 在 OpenClaw 中集成 WebSocket 服务器
- 实时推送 Agent Events
- 优点：实时性高，数据完整
- 缺点：需要修改 OpenClaw 源码

**方案 3：插件模式**
- 创建 OpenClaw 插件
- 通过 plugin-sdk 接收事件
- 优点：解耦，可配置
- 缺点：需要了解插件机制

## 未来改进

1. **实时事件流**
   - 集成到 OpenClaw 内部
   - 通过 WebSocket 推送事件

2. **历史数据存储**
   - 使用 SQLite 持久化
   - 支持查询和分析

3. **可视化增强**
   - 添加图表（recharts）
   - 性能指标仪表盘
   - 实时日志流

4. **告警机制**
   - 错误率阈值
   - 长时间运行检测
   - Token 使用预警

## 参考资料

- OpenClaw 源码：`/usr/local/lib/node_modules/openclaw/`
- Plugin SDK：`/dist/plugin-sdk/`
- 类型定义：`*.d.ts` 文件
