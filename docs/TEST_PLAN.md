# OpenClaw Monitor - 自动化测试计划

## 概述

本文档定义了 OpenClaw Monitor 项目的自动化测试策略，旨在防止回归、保证核心功能稳定性。

## 背景

最近修复的 bug：
- **问题**: WebSocket 和 HTTP 轮询存在数据竞争
- **表现**: WebSocket 连接时 HTTP 轮询仍在运行，导致重复请求和状态不一致
- **修复**: 在 `useMonitor.ts` 中，WebSocket 连接成功后停止 HTTP 轮询

## 测试金字塔

```
        /\
       /  \  E2E Tests (少量)
      /----\
     /      \  Integration Tests (中等)
    /--------\
   /          \  Unit Tests (大量)
  /____________\
```

## 测试覆盖目标

| 层级 | 覆盖率目标 | 优先级 |
|------|-----------|--------|
| Unit Tests | 80%+ | P0 |
| Integration Tests | 60%+ | P1 |
| E2E Tests | 核心流程 | P2 |

## 测试范围

### 1. 单元测试 (Unit Tests)

#### 1.1 后端服务

| 模块 | 测试文件 | 测试内容 |
|------|---------|---------|
| RunTracker | `run-tracker.test.ts` | ✅ 已覆盖 |
| LogWatcher | `log-watcher.test.ts` | ✅ 已覆盖 |
| EventCoordinator | `event-coordinator.test.ts` | 🆕 事件协调逻辑 |
| WebSocketServer | `websocket-server.test.ts` | 🆕 消息广播、连接管理 |
| SessionMonitor | `session-monitor.test.ts` | 🆕 Session 文件监控 |

#### 1.2 前端组件

| 组件 | 测试文件 | 测试内容 |
|------|---------|---------|
| useMonitor | `useMonitor.test.ts` | 🆕 WebSocket/HTTP 状态同步 |
| RunList | `RunList.test.tsx` | 🆕 点击选择、筛选逻辑 |
| SessionList | `SessionList.test.tsx` | 🆕 点击选择、复制功能 |

### 2. 集成测试 (Integration Tests)

#### 2.1 API 端点

| 端点 | 测试内容 |
|------|---------|
| `GET /api/state` | 返回完整状态 |
| `GET /api/sessions` | 返回 session 列表 |
| `GET /api/runs` | 返回 run 列表 |
| `POST /api/events` | 接收事件并广播 |
| `POST /api/replay` | 重放日志 |

#### 2.2 WebSocket 通信

| 场景 | 测试内容 |
|------|---------|
| 连接建立 | 发送初始状态 |
| 事件推送 | 实时事件广播 |
| 断线重连 | HTTP 轮询降级 |

### 3. E2E 测试 (可选)

| 场景 | 测试内容 |
|------|---------|
| 完整监控流程 | Session 选择 → Run 查看 → 事件流 |

## 重点测试场景

### 🚨 数据竞争测试 (Critical)

```typescript
// useMonitor.test.ts - 核心：确保 WS 连接后停止 HTTP 轮询
it('should stop HTTP polling when WebSocket connects', async () => {
  // 1. 初始化时应该开始 HTTP 轮询
  // 2. WebSocket 连接后应该停止 HTTP 轮询
  // 3. WebSocket 断开后应该恢复 HTTP 轮询
});
```

### 🔧 事件处理测试

```typescript
// event-coordinator.test.ts
it('should enrich tool events with arguments from session file', () => {
  // SessionFileWatcher 捕获工具参数
  // LogWatcher 捕获 tool start
  // EventCoordinator 合并两者
});
```

### 📡 WebSocket 测试

```typescript
// websocket-server.test.ts
it('should broadcast state to all connected clients', () => {
  // 多客户端同时连接
  // 状态更新广播到所有客户端
});
```

## 测试工具

| 工具 | 用途 |
|------|------|
| Vitest | 测试框架 |
| @testing-library/react | React 组件测试 |
| MSW | HTTP API Mock |
| mock-socket | WebSocket Mock |

## CI/CD 门禁

### Pre-commit Hook

```bash
#!/bin/sh
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit blocked."
  exit 1
fi
```

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
```

## 执行计划

### Phase 1: 核心单元测试 (2-3h)
- [x] RunTracker 测试
- [x] LogWatcher 测试
- [ ] EventCoordinator 测试
- [ ] WebSocketServer 测试

### Phase 2: 前端测试 (2-3h)
- [ ] useMonitor Hook 测试（数据竞争重点）
- [ ] RunList 组件测试
- [ ] SessionList 组件测试

### Phase 3: 集成测试 (2-3h)
- [ ] API 端点测试
- [ ] WebSocket 通信测试

### Phase 4: CI/CD 配置 (1h)
- [ ] GitHub Actions 工作流
- [ ] Pre-commit hook

## 测试命令

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test -- --coverage
```

## 维护指南

1. **新增功能** → 同步添加单元测试
2. **Bug 修复** → 添加回归测试
3. **重构** → 确保现有测试通过
4. **定期** → 更新测试覆盖率目标

---

*文档创建: 2026-02-27*
*最后更新: 2026-02-27*
