# CMX Harness — Claude Code 项目说明

## 项目简介

DevOps 研发交付 Harness，面向单研发团队的一体化研发交付平台。
平台管理交付闭环（需求→任务→测试→发布→验收→度量），GitHub 负责代码协作与 CI/CD。

**PRD：** `docs/superpowers/specs/2026-08-20-devops-delivery-harness-prd-v2.md`（v2.0 当前有效）
**实施计划：** `docs/superpowers/plans/2026-08-20-devops-delivery-harness-implementation-plan-v2.md`（v2.0 当前有效）

> v1 版本文件（`2026-08-18-*.md`）保留为历史归档，不再具有当前权威性；实施与验收一律以 v2 为准。

## 技术栈

**权威依据：** `docs/trace/ARCHITECTURE.md`（技术选型与架构决策，HARN-001 已确认）

- Runtime: Node.js >= 20
- 框架: Next.js 15（App Router），全栈单体（前端 + API 路由）
- 语言: TypeScript 5.9.x（strict）
- 数据库: SQLite（本地）→ PostgreSQL（生产），Prisma 6.19.x
- 测试: Node.js 内置 test runner + tsx loader，不用 Jest/Mocha
- 后台任务: node-cron（阶段 5 加入）
- GitHub 集成: GitHub App + Webhook + octokit（阶段 4 加入）
- CI/CD: GitHub Actions
- 代码规范: ESLint + Prettier

## 目录结构（当前实际）

```
src/app/                  # Next.js 页面 + API 路由（HTTP 入口）
src/modules/              # 业务用例层（需求/任务/评审/发布/验收/度量/工作台）
src/domain/               # 纯领域层：实体 + 状态机 + 门禁（零框架依赖）
src/integrations/github/  # GitHub 集成（幂等，外部世界隔离）
src/shared/               # Prisma 单例、常量、工具
prisma/                   # Prisma schema 与迁移
test/                     # 测试（node --test）
docs/superpowers/specs/   # PRD 和规格
docs/superpowers/plans/   # 实施计划
```

**依赖方向（禁止反向依赖）：** `app → modules → domain →（无依赖）`；`integrations` 只被 modules 调用。

## 常用命令

```bash
npm test          # 运行测试（Node.js built-in test runner）
npm run build     # 构建
npm start         # 启动服务
```

## 代码规范

- 语言：TypeScript（strict，`tsconfig.json` 已开启）
- 测试：Node.js 内置 test runner（`node --test`）+ tsx loader，不用 Jest/Mocha
- 提交信息格式见下方

## 提交信息格式

每个任务提交必须包含追踪信息：

```
feat(HARN-NNN): 简短描述

Source: PRD-章节号
Plan Task: HARN-NNN
Requirement: 需求描述
Review: 评审结论
Tests: 测试命令和结果
Acceptance: 验收结论
Retro: 复盘项或"无"
```

## 全局约束

1. MVP 阶段：一个团队、一个项目、一个 GitHub 仓库（数据层绑定模型 1:N，MVP 仅暴露 1:1）
2. 每个开发任务必须能追溯到 PRD v2 条款（v2 章节号）和实施计划任务编号
3. 每个任务必须有独立可验证产出
4. GitHub Branch Protection 是实际合并阻断层；平台计算和展示交付门禁
5. 遵守 PRD v2 核心不变量（第 4 章）：事实源单一、可自动同步的不人工录入、门禁只判断不替代、追踪链锚定需求、状态流转留痕、事件处理幂等
6. 关键技术风险按 PRD v2 第 13 章应对：R-1 幂等/对账、R-3 未关联队列、R-5 Branch Protection、R-6 部署多源汇总、R-10 安全

## 注意事项

- `.worktrees/` 目录是 git worktree，不要直接修改
- 不做多团队管理、自研 Git/CI、复杂权限矩阵（MVP 非目标）
- 文档权威：PRD v2 > 实施计划 v2 > 历史文档（v1 仅作参考）
