# HARN-005 留痕记录 — 迭代与任务中心

> 阶段：阶段 3（HARN-005）
> 日期：2026-08-21
> 分支：`feature/HARN-005-iteration-task-center`

## 源头（Source）

- **PRD v2 章节：** PRD 8.4（迭代与计划）、PRD 8.5（任务中心）、PRD 9.2（任务状态机）

## 需求（Requirement）

- **需求描述：** 支持迭代创建、已评审需求加入迭代、任务拆分与分配、任务状态看板、任务状态流转（含留痕）。
- **需求编号：** HARN-005

## 评审（Review）

- **评审结论：** 通过
- **技术方案说明：**
  - 迭代服务 `src/modules/iterations/iteration.service.ts`：创建迭代、列表、详情、需求加入/移出、迭代看板聚合。
  - 任务服务 `src/modules/tasks/task.service.ts`：需求拆分任务（TASK-001 起顺序编号）、任务详情（含流转留痕）、状态流转。
  - 需求加入迭代前校验业务+技术评审均通过（复用 `gate-rules.reviewApproved`），未评审阻断并返回明确缺项说明。
  - 任务状态流转复用 HARN-002 状态机引擎（`transition()`）+ `taskStateMachine` 配置，同事务写入 Task 状态更新与 Transition 留痕。
  - 迭代看板（`iterationBoard`）：通过 Transition 表中 `to: '已排期'` 记录识别结转需求（跨迭代移入时写入留痕），将需求归入 planned/completed/blocked/carried 四个桶。
  - API 路由覆盖：`GET/POST /api/iterations`、`GET /api/iterations/[id]`、`PUT/DELETE /api/iterations/[id]/requirements`、`GET/POST /api/requirements/[code]/tasks`、`GET /api/tasks/[code]`、`POST /api/tasks/[code]/transition`。
- **评审风险与应对：**
  - 结转看板归类依赖 Transition 留痕存在，初版实现遗漏了跨迭代移入时写入留痕 → 修复：`addRequirementToIteration` 在检测到从其他迭代移入时创建 `to: '已排期'` 留痕记录。
  - 迭代测试中需求编号依赖创建顺序，测试 37 因初始占位需求缺失导致编号偏移 → 修复：在该测试用例前先创建占位需求（REQ-001）。
  - 需求测试 48 使用硬编码假 iterationId（`iter-1`）触发 SQLite 外键约束违反 → 修复：在测试内创建真实 Iteration 记录再关联。

## 开发（Implementation）

- **主要文件：**
  - `src/modules/iterations/iteration.service.ts` — 迭代服务（含看板聚合与结转留痕修复）
  - `src/modules/tasks/task.service.ts` — 任务服务（拆分、流转、留痕）
  - `src/app/api/iterations/route.ts` — 迭代列表与创建 API
  - `src/app/api/iterations/[id]/route.ts` — 迭代看板 API
  - `src/app/api/iterations/[id]/requirements/route.ts` — 需求加入/移出迭代 API
  - `src/app/api/requirements/[code]/tasks/route.ts` — 需求任务列表与创建 API
  - `src/app/api/tasks/[code]/route.ts` — 任务详情 API
  - `src/app/api/tasks/[code]/transition/route.ts` — 任务状态流转 API
  - `test/modules/iterations/iteration.service.test.ts` — 9 个迭代与任务测试
  - `test/modules/requirements/requirement.service.test.ts` — 外键修复（测试 48）

## 测试（Tests）

- **执行命令：** `npm test`
- **测试结果：** 67/67 通过
  - 迭代创建：名称/日期校验 ✅
  - 迭代列表：含需求数量 ✅
  - 需求加入迭代：未评审阻断并说明缺项 ✅
  - 需求加入迭代：评审通过可加入，重复加入幂等 ✅
  - 需求不存在报错 ✅
  - 迭代看板：计划/完成/阻塞/结转四桶归类正确 ✅
  - 任务拆分：TASK-001 起编号、类型校验、初始待处理 ✅
  - 任务状态流转：合法流转留痕，非法流转拒绝且无留痕 ✅
  - 异常状态（阻塞）流转与解除 ✅

## 验收（Acceptance）

- **验收结论：** 通过
- **验收门禁对照：**
  - 已通过评审的需求能进入迭代 ✅
  - 需求能拆分为多个任务 ✅
  - 任务状态能按规则流转 ✅
  - 需求详情能追踪任务（`GET /api/requirements/[code]/tasks`）✅

## 复盘（Retro）

- **遗留问题：** 迭代看板页面 UI（前端）未在本任务实现，留待后续前端阶段补充。
- **改进项：**
  - 结转归类依赖 Transition 留痕写入，该逻辑与业务流转留痕混用同一张表；后续可考虑加 `kind` 字段区分业务流转留痕与系统内部留痕。
  - 测试中编号与 DB 创建顺序强耦合，建议后续用 `findFirst({ where: { title } })` 代替 `findUnique({ code: 'REQ-NNN' })` 减少脆弱性。
