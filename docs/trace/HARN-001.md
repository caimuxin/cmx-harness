# HARN-001 留痕记录 — 工程骨架与留痕机制

> 阶段：阶段 1（HARN-001）
> 日期：2026-08-20
> 分支：`feature/HARN-001-project-foundation`

## 源头（Source）

- **PRD v2 章节：** PRD 1（产品定位）、PRD 17（切片 0）、PRD 19（实施计划默认决策）、PRD 15（任务边界与完成标准）

## 需求（Requirement）

- **需求描述：** 建立可运行、可测试、可持续集成的工程基础，为所有后续任务提供 Adapt 留痕模板，并满足 PRD 第 15 章任务边界与完成标准。
- **需求编号：** HARN-001

## 评审（Review）

- **评审结论：** 通过（技术方案选择，见下）
- **技术方案说明：**
  - 框架：**Next.js 15 全栈单体（App Router）**——页面/API/Webhook 一个应用承载，单实例部署；本地开发优先、部署目标未定时是最通用起点。
  - 语言：**TypeScript**（strict）——领域模型/状态机/门禁强类型友好，编译期拦截错误。
  - 数据库：**Prisma + SQLite**（关系型优先，PRD 19.9）；生产可切 PostgreSQL 仅改 datasource。
  - 测试：Node 内置 test runner（`node --test`）+ `tsx` 作为 TS loader（不用 Jest/Mocha，符合 CLAUDE.md 约束）。
  - 模块边界（PRD 15 章）：`src/app` 页面与路由、`src/modules` 业务模块、`src/domain` 领域模型、`src/integrations/github` GitHub 集成、`src/shared` 共享能力。
- **评审风险与应对：**
  - Node 20 `node --test` 直接跑 .ts 报 `ERR_UNKNOWN_FILE_EXTENSION` → 用 `--import tsx` 解决。
  - `node --test` 无参递归扫描会混入 `.worktrees/` 目录 → `npm test` 用 `find test` 限定范围。

## 开发（Implementation）

- **主要改动文件：**
  - `package.json`、`tsconfig.json`、`next.config.js`、`.gitignore`、`.env.example`
  - `prisma/schema.prisma`（Project 最小模型，为 HARN-002 扩展铺路）
  - `src/app/layout.tsx`、`src/app/page.tsx`、`src/app/api/health/route.ts`、`src/app/api/internal/health/route.ts`
  - `src/shared/lib/prisma.ts`（Prisma 单例）
  - `docs/trace/TRACE_TEMPLATE.md`、`test/*.test.ts`、`.github/workflows/ci.yml`
- **关键实现说明：**
  - 健康检查 API 真实连接 SQLite（`db.connected: true`）。
  - Prisma 全局单例避免 dev 热重载连接泄漏。
  - CI：npm ci → prisma generate → prisma db push → npm test → npm run build。

## 测试（Tests）

- **执行命令：** `npm test`、`npm run build`、`npm start + curl /api/health`
- **测试结果：**
  - `npm test`：4/4 通过（留痕模板完整性、package scripts、strict 模式、SQLite 存在）。
  - `npm run build`：通过，路由 /、/api/health、/api/internal/health 生成成功。
  - 冒烟：`/api/health` 返回 `{"status":"ok","db":{"connected":true,"projects":1}}`；首页 HTTP 200。

## 验收（Acceptance）

- **验收结论：** 通过
- **验收证据：** 工程可启动（server Ready in 311ms）；测试命令通过；构建命令通过；留痕模板存在；HARN-001 留痕记录完整。
- **验收门禁对照：** 阶段 1 出口检查全部达成（工程可启动 / 测试构建通过 / 留痕模板存在）。

## 复盘（Retro）

- **遗留问题：**
  1. `src/domain`、`src/modules`、`src/integrations/github` 目录骨架未创建（HARN-002 开始建）。
  2. Prisma `Project` 模型为最小骨架，完整领域模型 HARN-002 扩展。
- **改进项：**
  - 调试过程中误删 `.worktrees/devops-harness-mvp`（cmx-harness 的 git worktree），导致其分支不可恢复——已向用户说明。后续执行 `rm -rf` 前必须先确认目录归属，且不得对 `.worktrees/` 直接操作。
  - `node --test` 的 .ts 支持在 Node 20 依赖 `tsx` loader，已在 CLAUDE.md/package.json 固化。
