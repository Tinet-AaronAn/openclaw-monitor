# Demo 模式说明

## 问题现象

用户发现 `"message": "Hello, I read the file!"` 每隔 1-2 秒重复执行。

## 原因分析

这是 **Monitor 的 Demo 模式**自动生成的模拟数据，**不是真实的 OpenClaw 运行**。

### 证据

1. **配置文件：** `.env` 中 `DEMO_MODE=true`
2. **服务器日志：** 显示 "Demo mode enabled - generating sample events"
3. **生成频率：** 每 5 秒生成一组模拟事件

### 模拟事件流程

```javascript
// 每 5 秒执行一次
function generateDemoEvents() {
  const runId = `run-${Date.now()}`;
  
  // 1. Run 开始
  emitAgentEvent({
    runId,
    stream: 'lifecycle',
    data: { event: 'run_started' }
  });
  
  // 2. Tool 调用（1秒后）
  setTimeout(() => {
    emitAgentEvent({
      runId,
      stream: 'tool',
      data: { tool: 'read', args: { file: 'example.txt' } }
    });
  }, 1000);
  
  // 3. Assistant 回复（2秒后）
  setTimeout(() => {
    emitAgentEvent({
      runId,
      stream: 'assistant',
      data: { message: 'Hello, I read the file!' }  // <-- 这就是你看到的重复消息
    });
  }, 2000);
  
  // 4. Run 完成（3秒后）
  setTimeout(() => {
    emitAgentEvent({
      runId,
      stream: 'lifecycle',
      data: { event: 'run_completed' }
    });
  }, 3000);
}
```

## 解决方案

### 已采取的措施

✅ **关闭 Demo 模式**
```bash
# 编辑 .env
DEMO_MODE=false
```

✅ **重启服务**
```bash
npm run dev
```

✅ **验证结果**
```
Runs: 0
Events: 0
```

### 当前状态

- ✅ Demo 模式已关闭
- ✅ 不再生成假数据
- ✅ Monitor 服务正常运行
- ⚠️ 无真实数据（需要集成 OpenClaw）

## 真实数据集成方案

### 方案 1：修改 OpenClaw 源码（最直接）

**位置：** `/usr/local/lib/node_modules/openclaw/dist/infra/agent-events.js`

**修改：** 在 `emitAgentEvent` 函数中添加 HTTP 推送

```javascript
export function emitAgentEvent(event) {
  // 现有逻辑
  const fullEvent = {
    ...event,
    seq: nextSeq++,
    ts: Date.now()
  };
  
  // 通知监听器
  for (const listener of listeners) {
    listener(fullEvent);
  }
  
  // 新增：推送到 Monitor
  fetch('http://localhost:3011/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullEvent)
  }).catch(err => console.error('Monitor push failed:', err));
}
```

**优点：**
- 最直接
- 无需插件
- 实时推送

**缺点：**
- 修改源码
- 更新 OpenClaw 后需要重新修改

### 方案 2：使用 OpenClaw 插件（推荐）

**已创建：** `projects/openclaw-monitor-plugin/`

**步骤：**
1. 构建插件
```bash
cd ~/.openclaw/workspace/projects/openclaw-monitor-plugin
npm install
npm run build
```

2. 配置 OpenClaw
```bash
openclaw config edit
```

添加：
```yaml
plugins:
  - path: ~/.openclaw/workspace/projects/openclaw-monitor-plugin
```

3. 重启 OpenClaw
```bash
openclaw gateway restart
```

**优点：**
- 不修改源码
- 符合 OpenClaw 架构
- 易于维护

**缺点：**
- 需要配置插件
- 稍微复杂

### 方案 3：使用 Session 文件监控（已实现）

**当前状态：** ✅ 已实现

**原理：** 监听 `~/.openclaw/sessions/*.session.json` 文件变化

**限制：**
- 只能获取 Session 数据
- 无法获取实时 Run/Event 数据
- 有延迟

## 推荐方案

**短期（快速测试）：**
- 使用方案 1（修改源码）
- 简单直接
- 立即生效

**长期（生产环境）：**
- 使用方案 2（插件）
- 不修改源码
- 易于维护

## 下一步

1. **立即可用：** Monitor 已就绪，等待真实数据
2. **如需真实数据：** 选择方案 1 或方案 2
3. **当前可用：** 局域网访问 `http://192.168.10.127:5174/`

---

**文档更新：** 2026-02-24 17:12
**问题状态：** ✅ 已解决（Demo 模式已关闭）
