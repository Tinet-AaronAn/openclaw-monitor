# 获取工具参数的方案研究

## 问题

当前日志只记录：
```
embedded run tool start: runId=xxx tool=exec toolCallId=yyy
```

缺少：
- exec 的具体命令
- read 的文件路径
- write 的写入内容

## 方案对比

### 方案 1：修改 OpenClaw 日志格式 ⭐ 推荐

**优点：**
- 一次修改，永久生效
- 不影响性能
- 日志中直接包含参数

**实现：**

修改 `/usr/local/lib/node_modules/openclaw/dist/subsystem-BCQGGxdd.js`

找到类似代码：
```javascript
// 当前
emitAgentEvent({
  stream: 'tool',
  data: {
    event: 'tool_start',
    tool: toolName,
    toolCallId: toolCallId
  }
});

// 修改为
emitAgentEvent({
  stream: 'tool',
  data: {
    event: 'tool_start',
    tool: toolName,
    toolCallId: toolCallId,
    args: args // 添加参数
  }
});
```

**示例输出：**
```json
{
  "tool": "exec",
  "event": "start",
  "args": {
    "command": "echo 'hello'",
    "timeout": 30000
  }
}
```

**注意：**
- 需要过滤敏感信息（密码、token 等）
- 参数可能很大，需要截断

---

### 方案 2：使用 OpenClaw Plugin Hook

**优点：**
- 不修改源码
- 符合 OpenClaw 架构

**实现：**

创建插件：
```typescript
// src/index.ts
export const hooks = {
  async onToolCall(toolName: string, args: any) {
    // 发送到 Monitor
    await fetch('http://localhost:3011/api/tool-calls', {
      method: 'POST',
      body: JSON.stringify({ tool: toolName, args })
    });
  }
};
```

**缺点：**
- 需要配置插件
- 可能影响性能

---

### 方案 3：使用 Agent Events API

**检查：** OpenClaw 是否有 API 可以获取工具调用详情？

```bash
# 检查可用方法
openclaw gateway call --help
```

---

### 方案 4：解析 Model 流

OpenClaw 有 `--raw-stream` 选项，可以记录模型输出。

**检查：**
```bash
openclaw logs --limit 50 --json | grep "tool_calls"
```

---

## 推荐方案

**短期（立即可用）：** 方案 1 - 修改日志格式

**长期（更优雅）：** 方案 2 - Plugin Hook

---

## 实施步骤（方案 1）

### 1. 备份原文件
```bash
cp /usr/local/lib/node_modules/openclaw/dist/subsystem-BCQGGxdd.js \
   /usr/local/lib/node_modules/openclaw/dist/subsystem-BCQGGxdd.js.backup
```

### 2. 找到工具调用代码
```bash
grep -n "embedded run tool start" /usr/local/lib/node_modules/openclaw/dist/subsystem-BCQGGxdd.js
```

### 3. 修改代码

在 `emitAgentEvent` 调用中添加 `args` 字段。

### 4. 重启 OpenClaw
```bash
openclaw gateway restart
```

### 5. 更新 Monitor

修改 `log-watcher.ts` 解析 `args` 字段。

---

## 参数截断策略

为避免日志过大：

```typescript
function truncateArgs(args: any, maxLength = 200): string {
  const str = JSON.stringify(args);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// 示例
{
  "command": "echo 'this is a very long command that needs to be truncated...'",
  "file": "/path/to/file"
}
```

---

## 安全过滤

过滤敏感字段：

```typescript
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey'];

function filterSensitive(args: any): any {
  const filtered = { ...args };
  for (const field of SENSITIVE_FIELDS) {
    if (filtered[field]) {
      filtered[field] = '***FILTERED***';
    }
  }
  return filtered;
}
```

---

## 下一步

1. 确定使用哪个方案
2. 实施修改
3. 测试验证
4. 更新 Monitor 界面

需要我继续实施哪个方案？
