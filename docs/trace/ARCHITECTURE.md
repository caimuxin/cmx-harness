# CMX Harness 技术选型与架构决策（Architecture Decision）

- 日期：2026-08-20
- 状态：active（已确认，2026-08-20 人工确认通过）
- 来源：PRD v2（`docs/superpowers/specs/2026-08-20-devops-delivery-harness-prd-v2.md`）、HARN-001 留痕、2026-08-20 人工确认（ESLint+Prettier、node-cron、octokit 三项落定）
- 权威性：本文档是后续所有阶段（HARN-002 起）的技术依据；与实施计划冲突时，以本文档和 PRD v2 为准。

---

## 1. 决策框架

| 维度 | 产品要求 | 推导出的选型 |
| --- | --- | --- |
| 产品形态 | 单团队交付闭环平台，13 页面 + API + Webhook | 全栈 Web 应用 |
| 领域复杂度 | 强领域模型（状态机/门禁/追踪链） | 领域层纯 TS，无框架依赖 |
| 外部集成 | GitHub Webhook + Actions + Deployment | 独立集成模块，幂等+对账 |
| 后台任务 | 对账、超时检查（PRD R-4/R-6） | 定时任务 |
| 部署 | 单实例，本地优先，后续容器 | 单应用部署 |
| 度量 | 从留痕数据计算，口径固定 | 领域层计算，DB 只存事实 |

## 2. 技术选型结论

| 层 | 选型 | 版本 | 关键理由 |
| --- | --- | --- | --- |
| 运行时 | Node.js | >= 20 | 已验证；worktree 旧实现也是 Node，团队熟悉 |
| Web 框架 | Next.js（App Router） | 15.3.4 | 阶段 1 已落地；全栈单体契合单团队 MVP |
| 语言 | TypeScript | 5.9.x | strict 模式；领域强类型，编译期拦截错误 |
| 数据库 | SQLite（本地）→ PostgreSQL（生产） | Prisma 6 | PRD 19.9 关系型优先；切库只改 datasource |
| ORM | Prisma | 6.19.x | 类型化 schema；迁移；已验证 |
| 测试 | Node 内置 test runner + tsx | tsx 4.x | CLAUDE.md 约束（不用 Jest/Mocha）；已验证 |
| 后台任务 | node-cron | 已定（阶段 5 加） | 对账/超时调度 |
| GitHub 集成 | GitHub App + Webhook + octokit | octokit 已定（阶段 4 加） | PRD 11、R-1/R-10 |
| 代码规范 | ESLint + Prettier | 已定（阶段 2 起执行） | 阶段 1 未加，阶段 2 补 |

## 3. 分层架构

```
src/
├── app/                  # Next.js 页面 + API 路由（HTTP 入口）
├── modules/              # 业务用例层（需求/任务/评审/发布/验收/度量/工作台）
├── domain/               # 纯领域层：实体 + 状态机 + 门禁（零框架依赖，核心）
├── integrations/
│   └── github/           # GitHub App/Webhook/对账/部署（幂等，外部世界隔离）
└── shared/               # Prisma 单例、常量、工具
```

**依赖方向（禁止反向依赖）**：

```text
app → modules → domain →（无依赖）
  └──── integrations（只被 modules 调用，不反向依赖 domain）
```

## 4. 关键架构决策与 PRD v2 风险呼应

| 决策 | 选型 | 应对风险 |
| --- | --- | --- |
| Webhook 幂等 | 按外部对象 ID 去重 + 原始事件存储 + 重放 | R-1 |
| 对账 | node-cron 定时拉取，以 GitHub 为准 | R-4 |
| 部署状态多源 | deployment_status > workflow run > 人工确认 | R-6 |
| 门禁只判断 | 平台计算展示，分支保护在 GitHub 执行 | R-5 |
| 状态机配置化 | 状态/流转/门禁存 DB，领域层纯函数执行 | I-8 |
| 指标口径固定 | 度量仅从留痕数据算，口径在 domain 固定 | R-7 |
| GitHub 事件幂等 | 外部对象 ID 去重 + 原始事件 payload 存储 | I-7、R-1 |

## 5. 明确不选（避免过度设计）

- 不选微服务/多应用拆分（单团队 MVP，单实例够）
- 不引入重型状态机库（自建轻量状态机，领域层纯函数）
- 不引入消息队列（Webhook + 对账足够，不需要 MQ）
- 不引入测试框架 Jest/Mocha（CLAUDE.md 约束）
- 不做前后端分离（Next.js 全栈单体，必要时演进）

## 6. 对后续阶段的指导

| 阶段 | 技术影响 |
| --- | --- |
| 阶段 2（HARN-002 领域模型） | 建 `src/domain/`：实体 + 状态机 + 门禁为纯 TS 函数，零框架依赖，直接 `node --test` 测试 |
| 阶段 2（HARN-003/004 需求/评审） | 建 `src/modules/requirements`、`src/modules/reviews`；API 放 `src/app/api/`；引入 ESLint + Prettier（已定） |
| 阶段 4（HARN-006 GitHub） | 建 `src/integrations/github/`，加 octokit；Webhook 幂等 + 对账 |
| 阶段 5（HARN-008 对账） | 加 node-cron 定时任务 |
| 阶段 6（HARN-010 发布） | 部署多源汇总逻辑在 domain，触发在 integrations/github |

## 7. 历史参考

- 旧 worktree 实现（`agent/devops-harness-mvp`）使用原生 Node 零依赖 + `src/modules/*` 目录结构，模块划分与新 PRD v2 一致，但无 TypeScript、无框架。本次选型在保留其模块边界思想的基础上，引入 TS + Next.js + Prisma 提升工程化。
