# OpenClaw Monitor 测试文档

## 测试结构

```
tests/
├── setup.ts                          # 测试环境初始化
├── log-watcher.test.ts               # ✅ 日志监控单元测试
├── run-tracker.test.ts               # ✅ Run 追踪单元测试
├── event-coordinator.test.ts         # 🆕 事件协调器单元测试
├── websocket-server.test.ts          # 🆕 WebSocket 服务器单元测试
├── useMonitor.test.ts                # 🆕 useMonitor Hook 测试（数据竞争重点）
├── api.test.ts                       # 🆕 API 端点集成测试
├── RunList.test.tsx                  # 🆕 RunList 组件测试
└── SessionList.test.tsx              # 🆕 SessionList 组件测试
```

## 测试覆盖范围

### 核心功能测试

| 功能 | 测试文件 | 覆盖率 |
|------|---------|--------|
| 日志解析 | `log-watcher.test.ts` | ✅ |
| Run 状态跟踪 | `run-tracker.test.ts` | ✅ |
| 事件协调 | `event-coordinator.test.ts` | 🆕 |
| WebSocket 通信 | `websocket-server.test.ts` | 🆕 |
| HTTP/WebSocket 状态同步 | `useMonitor.test.ts` | 🆕 (重点) |
| API 端点 | `api.test.ts` | 🆕 |
| RunList 组件 | `RunList.test.tsx` | 🆕 |
| SessionList 组件 | `SessionList.test.tsx` | 🆕 |

### 🚨 数据竞争修复测试 (Critical)

文件: `tests/useMonitor.test.ts`

测试场景:
1. **WS 连接后停止 HTTP 轮询** - 确保不会产生重复请求
2. **WS 断开后恢复 HTTP 轮询** - 确保有降级方案
3. **无并发更新** - 确保不会同时存在 WS 和 HTTP 更新

```typescript
it('should STOP HTTP polling when WebSocket connects', async () => {
  // 验证修复: WS 连接后不应再有 HTTP fetch
});
```

## 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## CI/CD 集成

### GitHub Actions

文件: `.github/workflows/test.yml`

触发条件:
- Push 到 main/develop 分支
- Pull Request 到 main/develop 分支

执行步骤:
1. TypeScript 类型检查
2. 运行测试套件
3. 生成覆盖率报告
4. 构建项目

### Pre-commit Hook

文件: `.husky/pre-commit`

自动在提交前运行测试，失败则阻止提交。

```bash
# 安装 husky
npm run prepare
```

## 测试策略

### 单元测试
- **范围**: 单个模块/函数
- **目标**: 80%+ 覆盖率
- **运行频率**: 每次代码变更

### 集成测试
- **范围**: API 端点、数据流
- **目标**: 核心流程覆盖
- **运行频率**: CI/CD 流程

### E2E 测试 (可选)
- **范围**: 完整用户流程
- **目标**: 关键路径
- **运行频率**: 发布前

## 编写新测试

### 后端测试示例

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### 前端组件测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('Component Name', () => {
  it('should render correctly', () => {
    render(<Component {...props} />);
    expect(screen.getByText('expected text')).toBeDefined();
  });
  
  it('should handle user interaction', () => {
    const onClick = vi.fn();
    render(<Component onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## 常见问题

### 测试失败排查

1. **检查依赖是否安装**
   ```bash
   npm ci
   ```

2. **单独运行失败的测试**
   ```bash
   npx vitest run tests/specific.test.ts
   ```

3. **查看详细输出**
   ```bash
   npx vitest run --reporter=verbose
   ```

### Mock 问题

- WebSocket: 使用 `MockWebSocket` 类
- Fetch: 使用 `vi.fn()` mock
- Clipboard: 在 `setup.ts` 中已全局 mock

## 维护指南

1. **新增功能** → 添加对应单元测试
2. **Bug 修复** → 添加回归测试防止复发
3. **重构** → 确保现有测试通过
4. **覆盖率下降** → 补充测试用例

---

*文档创建: 2026-02-27*
*最后更新: 2026-02-27*
