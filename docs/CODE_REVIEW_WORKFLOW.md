# 代码审查工作流程 (Code Review Workflow)

> 基于产研角色体系的自动化代码审查流程

---

## 📋 概述

本文档定义了 OpenClaw Monitor 项目的代码审查流程，集成产研角色体系与 GitHub Actions CI/CD。

---

## 🎯 设计目标

1. **自动化审查**: 严审（Code Review Agent）作为 CI 的一环自动运行
2. **快速反馈**: 10 分钟内完成审查并反馈结果
3. **质量门禁**: 未通过审查的 PR 无法合并
4. **人工兜底**: 关键决策需要安老师最终 approve

---

## 🔄 审查流程

```
┌─────────────────────────────────────────────────────────────┐
│              PR 触发自动化审查流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ 开发完成 → 创建 PR                                       │
│     └─> 触发 GitHub Actions                                  │
│                                                              │
│  2️⃣ 并行执行 (Parallel Execution)                           │
│     ├─> 🧪 CI Test (陆测)                                    │
│     │   └─> 81 个测试用例                                    │
│     │                                                        │
│     ├─> 🔍 Code Review (严审)                                │
│     │   ├─> TypeScript 类型检查                              │
│     │   ├─> 代码格式检查                                     │
│     │   ├─> 测试运行                                         │
│     │   └─> ⏱️ 10 分钟超时                                   │
│     │                                                        │
│     └─> 🔒 Security Scan (卫域)                              │
│         └─> 依赖漏洞扫描                                     │
│                                                              │
│  3️⃣ 审查结果                                                 │
│     ├─> ✅ 通过 → 自动添加 check + comment                   │
│     ├─> ❌ 失败 → 阻止合并，添加 review comments             │
│     └─> ⚠️ 超时 → 标记为"需人工审查"                         │
│                                                              │
│  4️⃣ 等待人工                                                 │
│     └─> 👤 安老师最终 approve → 允许合并                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 GitHub Actions 配置

### 1. Code Review Workflow

文件: `.github/workflows/code-review.yml`

**功能**:
- 自动分析 PR 变更
- 运行 TypeScript 类型检查
- 运行测试用例
- 检查代码格式
- 创建 Check Run（显示在 GitHub Checks 中）
- 添加 PR 评论（详细审查报告）

**超时**: 10 分钟

**触发条件**:
- PR opened
- PR synchronize (新提交)
- PR reopened

### 2. Test CI Workflow

文件: `.github/workflows/test.yml`

**功能**:
- 运行单元测试
- Node.js 版本矩阵测试 (20.x, 22.x)
- 代码覆盖率报告

---

## 🛡️ Branch Protection Rules

### Required Checks

在 GitHub 仓库设置中配置:

```
Settings → Branches → Branch protection rules → main
```

**Required checks**:
- ✅ Code Review (严审) - `review`
- ✅ Test CI - `test (20.x)`
- ✅ Test CI - `test (22.x)`

**Require approvals**:
- ✅ Require 1 approval (安老师)

---

## 📊 审查检查清单

严审会自动检查以下项目:

### 1. 代码质量
- [ ] 代码风格一致性 (Prettier)
- [ ] TypeScript 类型正确性
- [ ] 命名规范
- [ ] 注释和文档

### 2. 安全性
- [ ] 无 XSS 漏洞
- [ ] 无敏感信息泄露
- [ ] 输入验证完善
- [ ] 权限检查

### 3. 测试覆盖
- [ ] 单元测试通过 (81 tests)
- [ ] 边界条件覆盖
- [ ] 测试覆盖率 > 80%

### 4. 架构设计
- [ ] 模块职责清晰
- [ ] 依赖关系合理
- [ ] 无循环依赖

---

## 🚨 审查结果状态

| 状态 | 说明 | 是否阻止合并 |
|------|------|--------------|
| ✅ **通过** | 所有检查通过，建议合并 | ❌ 不阻止 |
| ⚠️ **需修改** | 有警告，建议修改但不强制 | ❌ 不阻止 |
| ❌ **阻止合并** | 有严重问题（测试失败/类型错误） | ✅ 阻止 |
| ⏱️ **超时** | 审查超时，需人工审查 | ⚠️ 需人工确认 |

---

## 🔧 产研角色协作

### 角色触发时机

| 角色 | 触发时机 | 超时 |
|------|----------|------|
| **周衡** (PM) | 项目启动、需求变更 | - |
| **宋绘** (Design) | PRD 完成后 | - |
| **梁构** (Architect) | 设计阶段、重大变更 | - |
| **行兵** (Coding) | 开发阶段 | - |
| **陆测** (Test) | 代码提交后 → CI 自动触发 | 5 分钟 |
| **严审** (Review) | PR 创建后 → CI 自动触发 | 10 分钟 |
| **卫域** (Security) | 架构阶段 + 发布前 | 10 分钟 |
| **程运** (DevOps) | 部署阶段 | - |
| **官文** (Doc) | 发布前后 | - |

### 严审工作流

```typescript
// 严审自动触发流程
async function triggerCodeReview(prNumber: number) {
  // 1. 创建 Check Run (运行中)
  await createCheckRun({
    name: '严审 Code Review',
    status: 'in_progress'
  });
  
  // 2. 执行审查任务 (10分钟超时)
  const result = await Promise.race([
    runReviewTask(prNumber),
    timeout(600000) // 10分钟
  ]);
  
  // 3. 更新 Check Run (完成)
  await updateCheckRun({
    conclusion: result.passed ? 'success' : 'failure',
    output: {
      title: result.title,
      summary: result.report
    }
  });
  
  // 4. 添加 PR 评论
  await addPRComment(prNumber, result.report);
  
  // 5. 发送钉钉通知
  await sendDingTalkNotification({
    title: `严审完成: PR #${prNumber}`,
    content: result.summary
  });
}
```

---

## 📬 通知机制

### 钉钉群通知

审查完成后，自动发送通知到 `openclaw-monitor项目群`:

```
🔍 严审完成: PR #4

状态: ✅ 通过
作者: Tinet-AaronAn
分支: feature/session-last-message-and-tests

检查项:
✅ TypeScript 类型检查
✅ 测试通过 (81/81)
✅ 代码格式

审查报告: https://github.com/.../checks

---
🦞 随行 OpenClaw
```

---

## 📝 最佳实践

### 对于开发者

1. **本地先测试**
   ```bash
   pnpm test
   pnpm build:server
   npx prettier --check "src/**/*.{ts,tsx}"
   ```

2. **查看审查报告**
   - PR 创建后 2 分钟内会收到初步反馈
   - 在 PR 的 Checks 标签页查看详细结果

3. **及时修复问题**
   - 严审失败会阻止合并
   - 修复后重新 push 会自动触发审查

### 对于审查者 (安老师)

1. **查看 Check Run**
   - 在 PR 页面的 Checks 区域查看严审结果

2. **查看 PR 评论**
   - 严审会添加详细评论

3. **最终决策**
   - 即使严审通过，也需要安老师 approve

---

## 🔮 未来改进

### 短期 (本周)
- [x] 严审集成到 CI/CD
- [x] 自动创建 Check Run
- [x] 自动添加 PR 评论
- [ ] 添加钉钉通知

### 中期 (下周)
- [ ] 代码行级别的审查建议 (Annotations)
- [ ] 与测试覆盖率集成
- [ ] 添加性能基准测试

### 长期 (本月)
- [ ] 机器学习辅助审查
- [ ] 历史问题知识库
- [ ] 自定义审查规则

---

## 📚 参考文档

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Check Runs API](https://docs.github.com/en/rest/checks/runs)

---

*最后更新: 2026-03-03*
*维护者: 随行 🦞*
