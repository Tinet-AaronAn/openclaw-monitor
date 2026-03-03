# OpenClaw Monitor 测试计划

## 概述

本文档描述 openclaw-monitor 项目的自动化测试策略和测试用例覆盖。

## 测试框架

- **测试框架**: Vitest 1.6.1
- **测试环境**: happy-dom (前端), Node.js (后端)
- **HTTP 测试**: supertest
- **WebSocket 测试**: ws (原生 WebSocket 客户端)
- **代码覆盖**: @vitest/coverage-v8

## 当前测试覆盖

### ✅ 后端测试 (57 个测试用例)

| 模块 | 文件 | 测试数 | 覆盖内容 |
|------|------|--------|----------|
| HTTP API | `tests/api.test.ts` | 17 | `/health`, `/api/state`, `/api/sessions`, `/api/runs`, `/api/events` |
| WebSocket 服务器 | `tests/websocket-server.test.ts` | 10 | 连接管理、状态推送、事件广播、错误处理 |
| 日志解析 | `tests/log-watcher.test.ts` | 7 | run start/done 解析、tool 事件、生命周期 |
| Run 追踪 | `tests/run-tracker.test.ts` | 6 | Run 状态管理、lifecycle 事件处理 |
| 事件协调 | `tests/event-coordinator.test.ts` | 8 | 工具调用参数增强、事件去重 |
| **数据竞争修复** | `tests/race-condition.test.ts` | 9 | WebSocket/HTTP 轮询互斥、状态一致性 |

### ⏸️ 前端测试 (暂时跳过)

| 模块 | 文件 | 原因 |
|------|------|------|
| RunList | `tests/RunList.test.tsx` | vitest + React 18 + happy-dom 兼容性问题 |
| SessionList | `tests/SessionList.test.tsx` | 同上 |
| useMonitor | `tests/useMonitor.test.ts` | 同上 |

**注意**: 前端测试已编写完整测试用例，但因环境问题暂时跳过。详见 TODO 列表。

## 核心回归测试

### 🚨 数据竞争修复测试

针对 WebSocket 和 HTTP 轮询数据竞争问题，已添加专门测试：

**文件**: `tests/race-condition.test.ts`

测试覆盖：
1. 初始状态启动 HTTP 轮询
2. WebSocket 连接后停止 HTTP 轮询
3. WebSocket 断开后恢复 HTTP 轮询
4. WebSocket 连接期间无 HTTP 轮询请求
5. WebSocket 断开后恢复 HTTP 轮询请求
6. WebSocket 消息只在连接时处理
7. Run 去重（相同 runId 不重复添加）
8. Run 状态更新（completed 更新对应 run）
9. Session 更新（新 session 添加，已有 session 更新）

**相关代码**: `src/client/hooks/useMonitor.ts`
- `ws.onopen` 调用 `stopPolling()`
- `ws.onclose` 调用 `startPolling()`

## CI/CD 门禁

### GitHub Actions

文件: `.github/workflows/test.yml`

触发条件:
- Push to `main`, `develop`
- Pull Request to `main`, `develop`

测试矩阵:
- Node.js 20.x, 22.x

步骤:
1. 代码检出
2. 安装依赖 (`npm ci`)
3. TypeScript 类型检查 (`npm run typecheck`)
4. 运行测试 (`npm run test`)
5. 生成覆盖率报告
6. 上传到 Codecov
7. 构建项目

### Pre-commit Hook

文件: `.husky/pre-commit`

每次 commit 前自动运行测试，失败则阻止提交。

## 测试策略

### 1. 单元测试

- 纯函数逻辑（日志解析、事件处理）
- 状态管理（RunTracker）
- 工具函数

### 2. 集成测试

- HTTP API 端点（使用 supertest）
- WebSocket 连接和消息（使用真实 WebSocket）
- 完整事件流（日志 → 解析 → WebSocket → 前端）

### 3. 端到端测试 (TODO)

- 前端组件交互
- 用户操作流程

## TODO 列表

### 高优先级

- [ ] 修复 vitest + React 18 + happy-dom 兼容性问题
  - 尝试升级到 vitest 2.x
  - 或使用 @testing-library/react-hooks 独立测试 hooks
  - 参考: https://github.com/vitest-dev/vitest/issues

### 中优先级

- [ ] 添加 E2E 测试 (Playwright/Cypress)
- [ ] 增加边界条件测试（大量数据、并发连接）
- [ ] 添加性能基准测试

### 低优先级

- [ ] Mock 时间依赖（使用 vi.useFakeTimers）
- [ ] 添加快照测试（UI 组件）
- [ ] 集成 Codecov PR 评论

## 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行单个测试文件
npm test -- tests/api.test.ts

# 详细输出
npm test -- --reporter=verbose
```

## 测试覆盖率目标

| 模块 | 当前 | 目标 |
|------|------|------|
| 后端核心 | ~90% | 95% |
| HTTP API | 100% | 100% |
| WebSocket | 100% | 100% |
| 前端组件 | N/A | 80% |

## 维护指南

### 添加新测试

1. 在 `tests/` 目录创建 `*.test.ts` 或 `*.test.tsx` 文件
2. 导入必要的测试工具: `import { describe, it, expect } from 'vitest'`
3. 遵循命名约定: `should_xxx_when_yyy`

### 测试原则

- **隔离性**: 每个测试应该独立，不依赖其他测试
- **可重复性**: 多次运行结果一致
- **清晰性**: 测试名称描述预期行为
- **快速**: 单元测试 < 100ms，集成测试 < 1s

### 常见问题

1. **WebSocket 端口冲突**: 使用动态端口（`getAvailablePort()`）
2. **定时器测试**: 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTimeAsync()`
3. **异步测试**: 使用 `async/await` 和 `waitFor()`

---

*最后更新: 2026-02-27*
*维护者: 陆测 (Test Agent)*
