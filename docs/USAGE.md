# OpenClaw Monitor 使用指南

## 快速开始

### 启动监控应用

```bash
cd ~/.openclaw/workspace/projects/openclaw-monitor
npm run dev
```

### 访问界面

- **前端界面**: http://localhost:5174/
- **API**: http://localhost:3011/api/state

## 功能说明

### 1. Sessions（会话）

显示所有 OpenClaw 会话，包括：
- Session Key
- Channel（钉钉/Telegram等）
- Model（使用的模型）
- Token 使用量

### 2. Runs（运行）

显示所有运行中的任务，包括：
- Run ID
- 状态（running/completed/failed/aborted）
- 事件数量
- 开始时间

### 3. Events Stream（事件流）

实时显示事件流：
- 🟢 lifecycle - 生命周期事件
- 🟣 tool - 工具调用
- 🟢 assistant - 助手回复
- 🔴 error - 错误

## Demo 模式

当前启用 Demo 模式，每 5 秒生成模拟事件：

```bash
# 关闭 Demo 模式
# 编辑 .env，设置 DEMO_MODE=false
```

## 真实监控（待实现）

要监控真实的 OpenClaw 运行时，需要：

1. **集成到 OpenClaw 内部**
   - 修改 OpenClaw 源码
   - 在 Agent Events 发射时推送

2. **或使用文件监听**
   - 监听 `~/.openclaw/sessions/*.session.json`
   - 当前已实现

3. **或使用插件模式**
   - 创建 OpenClaw 插件
   - 通过 plugin-sdk 接收事件

## API 端点

- `GET /api/sessions` - 获取所有会话
- `GET /api/runs` - 获取所有运行
- `GET /api/runs/:runId` - 获取指定运行
- `GET /api/runs/:runId/events` - 获取运行事件
- `GET /api/events` - 获取所有事件
- `GET /api/state` - 获取完整状态

## WebSocket

连接到 `ws://localhost:3012`，接收实时更新：

```javascript
const ws = new WebSocket('ws://localhost:3012');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
  // { type: 'run_started', payload: {...} }
  // { type: 'event', payload: {...} }
  // { type: 'session_updated', payload: {...} }
};
```

## 下一步

1. 集成到 OpenClaw 内部
2. 添加持久化存储
3. 添加图表可视化
4. 添加告警功能
