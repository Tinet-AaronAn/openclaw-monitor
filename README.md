# OpenClaw Monitor

实时监控 OpenClaw Agent Runtime 的运行状态。

## 🚀 快速开始

### 开发模式

```bash
cd ~/.openclaw/workspace/projects/openclaw-monitor
npm run dev
```

开发模式启动两个服务：
- **前端开发服务器**：http://localhost:5174/（Vite，热更新）
- **API 服务**：http://localhost:3011/
- **WebSocket**：ws://localhost:3012/

### 生产模式

```bash
npm run build
npm start
# 或使用 PM2
pm2 start npm --name "openclaw-monitor" -- start
```

生产模式所有服务在 3011 端口：
- **Web 界面 + API**：http://localhost:3011/
- **WebSocket**：ws://localhost:3012/

## 📊 功能特性

### 实时监控
- ✅ Session 管理（会话列表、状态追踪）
- ✅ Run 追踪（运行周期、工具调用）
- ✅ 事件流（实时 WebSocket 推送）
- ✅ 工具参数显示（完整参数 + 原始参数）

### 数据来源
通过监听 OpenClaw 日志文件捕获事件：
- `/tmp/openclaw/openclaw-{YYYY-MM-DD}.log`

支持的事件类型：
- `lifecycle`: run_started, run_completed, run_aborted
- `tool`: exec, read, write, edit, browser, message...

## 🔧 API 接口

### GET /api/state
获取完整状态数据

```json
{
  "sessions": [...],
  "runs": [...],
  "events": [...]
}
```

### GET /api/events
获取事件流

### POST /api/replay
重放当天日志（用于修复数据准确性）

```bash
curl -X POST http://localhost:3011/api/replay
```

## 🛠️ 开发

### 技术栈
- **前端**：React + Vite + TypeScript + Tailwind CSS
- **后端**：Express + WebSocket
- **数据处理**：实时日志解析

### 项目结构

```
openclaw-monitor/
├── src/
│   ├── client/          # React 前端
│   ├── server/          # Express API + WebSocket
│   │   ├── index.ts     # 主服务
│   │   ├── log-watcher.ts    # 日志监听
│   │   ├── run-tracker.ts    # Run 状态管理
│   │   └── session-file-watcher.ts  # Session 文件监听
│   └── shared/          # 共享类型
├── tests/               # 测试文件
└── docs/                # 文档
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 测试覆盖

项目使用 Vitest 进行自动化测试：

| 模块 | 测试文件 | 测试数 |
|------|----------|--------|
| HTTP API | `tests/api.test.ts` | 17 |
| WebSocket | `tests/websocket-server.test.ts` | 10 |
| 日志解析 | `tests/log-watcher.test.ts` | 7 |
| Run 追踪 | `tests/run-tracker.test.ts` | 6 |
| 事件协调 | `tests/event-coordinator.test.ts` | 8 |
| 数据竞争 | `tests/race-condition.test.ts` | 9 |

详细测试计划见 [docs/test-plan.md](docs/test-plan.md)

### CI/CD

- **GitHub Actions**: 每次 push 和 PR 自动运行测试
- **Pre-commit Hook**: 提交前自动运行测试，失败则阻止提交

## 📝 注意事项

- 数据存储在内存中，重启服务会丢失历史数据
- 如需持久化，可以考虑添加 SQLite 支持
- 日志文件按天分割，服务会自动切换到当天日志

## 🔗 相关资源

- [OpenClaw 文档](https://docs.openclaw.ai)
- [GitHub 仓库](https://github.com/Tinet-AaronAn/openclaw-monitor)
