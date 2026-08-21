# HARN-002 留痕记录 — 领域模型与状态机

> 阶段：阶段 2（HARN-002）
> 日期：2026-08-20
> 分支：`feature/HARN-002-domain-state-gates`

## 源头（Source）

- **PRD v2 章节：** PRD 7（端到端流程与追踪链路）、PRD 8（功能模块）、PRD 9（状态机）、PRD 10（门禁规则）

## 需求（Requirement）

- **需求描述：** 建立平台核心领域对象、状态机和门禁计算基础。状态流转必须支持时间戳留痕（I-5），门禁按 PRD 第 10 章「触发条件 → 判定 → 失败处理」结构返回原因与修复动作。
- **需求编号：** HARN-002

## 评审（Review）

- **评审结论：** 通过
- **技术方案说明：**
  - 领域层零框架依赖：`src/domain/` 不 import Prisma / Next / React，纯 TS 类型 + 纯函数，可直接被 API / Webhook / 页面共用。
  - **I-8 流程即配置**：状态机为配置化结构（`StateMachineConfig = Record<状态, Transition[]>`），业务代码只有 `transition()` 引擎，无任何 if/switch 硬编码流转。HARN-014 配置中心将覆盖同构配置。
  - **I-5 留痕**：`transition()` 每次成功流转生成 `StateTransitionRecord`（操作者/时间戳/原因），非法流转与缺原因均拒绝。
  - **异常状态原则（PRD 9 通则 3）**：异常状态只能经配置流转进入，出口必须显式配置，否则一旦进入无法退出。
  - 门禁引擎：四条门禁（10.1~10.4）各自独立计算函数，判定项可配置（`GateCheck[]`），失败返回全部未通过项 + 修复动作。
- **评审风险与应对：**
  - 测试文件在 `test/domain/` 子目录，相对导入需 `../../src/`，直接用 `../src/` 报 `MODULE_NOT_FOUND` → 修正导入路径。
  - 终态（`已关闭`/`已完成`/`取消`/`驳回`）最初未作为配置 key 声明，配置完整性校验测试捕获 → 显式声明为 `[]`。

## 开发（Implementation）

- **主要改动文件：**
  - `src/domain/types.ts` — 公共类型（ObjectId、StateTransitionRecord、StateMachineConfig）
  - `src/domain/models.ts` — 核心领域对象（Requirement/Task/Review/Iteration/TestCase/TestPlan/Defect/ReleaseTicket/Deployment/Acceptance/RetrospectiveItem/GateRule），枚举严格对齐 PRD 8.x / 9.x
  - `src/domain/state-machine.ts` — 状态机引擎（canTransition / transition / allowedTransitions）
  - `src/domain/state-machine-config.ts` — MVP 默认状态机配置（需求 9.1 / 任务 9.2 / 发布 9.3）
  - `src/domain/gate-rules.ts` — 四类门禁计算函数（10.1~10.4）+ 聚合辅助
  - `prisma/schema.prisma` — 领域对象持久化模型（含 Transition 留痕表，I-5）
  - `test/domain/state-machine.test.ts`、`test/domain/gate-rules.test.ts`
- **关键实现说明：**
  - 状态枚举值用中文原文（与 PRD 一致），配置流转表直接可读。
  - 部署状态来源（DeploymentSource）：deployment_status事件 > workflow run > 人工记录（PRD 5.3）。
  - Prisma `Transition` 表通过可选外键关联 Requirement/Task/ReleaseTicket/Defect。

## 测试（Tests）

- **执行命令：** `npm test`
- **测试结果：** 37/37 通过（HARN-001 的 6 个基础测试 + 领域层 31 个新测试）
  - 状态机：主流转合法（需求 11 步 / 任务 5 步 / 发布 6 步）、非法流转拒绝（跳过中间态、跨流程）、留痕完整性（操作者/时间戳/原因）、原因必填、异常状态进出、终态无出口、配置目标状态完整性（防拼写漂移）。
  - 门禁：10.1 全部判定项（业务价值/验收标准/业务评审/技术评审/迭代计划）通过/失败与修复动作；10.2 评审人/Actions/阻塞缺陷；10.3 审批/测试/阻塞/制品/环境/回滚方案；10.4 生产验证/业务验收/例外通道/度量数据不足标记。
- **构建：** `npm run build` 通过（路由 /、/api/health、/api/internal/health）。
- **数据库：** `npx prisma db push` + `prisma generate` 成功，SQLite 同步领域模型。

## 验收（Acceptance）

- **验收结论：** 通过
- **验收门禁对照：**
  - 非法状态流转会被拒绝 ✅（`transition()` 返回 `{ok:false}`，不产生记录）
  - 每次流转有操作者、时间戳、原因记录 ✅（I-5，留痕测试覆盖）
  - 门禁失败时能返回明确失败原因与修复动作 ✅（四条门禁全量判定项测试）
  - 所有核心对象能表达 PRD 中的追踪链路 ✅（Requirement 关联 Task/Review/TestCase/Defect/Acceptance/RetrospectiveItem，Deployment 关联 ReleaseTicket，Defect 可关联 Task/TestCase/PR）

## 复盘（Retro）

- **遗留问题：**
  - 门禁引擎的输入聚合（`requirementCloseInput` 等）目前以领域对象为参数，数据层接入（HARN-003 需求中心）时在 modules 层完成 Prisma 映射。
  - 管理员豁免入口（异常状态人工置入）留待 HARN-014 权限模块接入。
- **改进项：**
  - 配置完整性校验测试（防拼写漂移）是本任务最有价值的测试——它捕获了终态未声明为 key 的设计缺口。后续每次改状态机配置都应跑该测试。
  - 中文状态值直接作为配置 key 可读性极好，但依赖 UTF-8 一致性；测试中用 `Set.has` 而非稀疏数组 `includes`，避免中文匹配陷阱。
