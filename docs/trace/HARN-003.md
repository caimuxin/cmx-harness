# HARN-003 留痕记录 — 需求中心

> 阶段：阶段 2（HARN-003）
> 日期：2026-08-20
> 分支：`feature/HARN-003-requirement-center`

## 源头（Source）

- **PRD v2 章节：** PRD 8.2（需求中心）、PRD 9.1（需求状态机）、PRD 10.1（需求进入开发门禁）

## 需求（Requirement）

- **需求描述：** 需求全生命周期管理：创建（编号 REQ-001 起顺序递增、初始草稿）、详情（含评审状态聚合）、编辑、状态流转（配置化状态机 + 留痕）、进入开发门禁展示与阻断、关闭门禁。
- **需求编号：** HARN-003

## 评审（Review）

- **评审结论：** 通过
- **技术方案说明：**
  - 服务层 `src/modules/requirements/requirement.service.ts` 复用 HARN-002 状态机引擎（`transition()`）与门禁引擎（`evaluateRequirementEnterDev` / `evaluateRequirementClose`）。
  - 状态流转在服务层统一处理：先走状态机校验（非法流转拒绝且无留痕），目标为「开发中」执行 10.1 门禁、目标为「已关闭」执行 10.4 门禁，通过后在同一事务内更新状态 + 写 Transition 留痕（I-5）。
  - 编号生成 `nextRequirementCode()`：取现有最大编号 +1，顺序递增不复用。
  - API 路由：`/api/requirements`（列表+创建）、`/api/requirements/[code]`（详情+编辑）、`/api/requirements/[code]/transition`（状态流转，独立子路由）。
  - 页面：列表页（创建表单+表格）、详情页（需求信息、10.1 门禁判定项展示、流转表单、留痕时间线）。
  - 门禁输入聚合：业务/技术评审通过状态由 `reviewApproved()`（按最新评审结论）计算，排期状态取 `iterationId` 是否赋值。
- **评审风险与应对：**
  - 前端调用 `/api/requirements/[code]/transition`，而流转 POST 起初写在 `[code]/route.ts`（不匹配该路径）→ 冒烟测试发现 404，拆出独立 `transition/route.ts`。
  - Prisma 返回类型与领域联合类型不匹配（如 `reviewApproved` 参数）→ 将门禁辅助函数参数放宽为最小形状（`{kind:string;conclusion:string}` 等）。

## 开发（Implementation）

- **主要改动文件：**
  - `src/modules/requirements/requirement.service.ts` — 需求服务（创建/详情/列表/编辑/流转/门禁）
  - `src/app/api/requirements/route.ts` — GET 列表 / POST 创建
  - `src/app/api/requirements/[code]/route.ts` — GET 详情 / PATCH 编辑
  - `src/app/api/requirements/[code]/transition/route.ts` — POST 状态流转
  - `src/app/requirements/page.tsx` — 需求列表页（创建表单）
  - `src/app/requirements/[code]/page.tsx` — 需求详情页（门禁/流转/留痕）
  - `src/domain/gate-rules.ts` — 辅助函数参数放宽（Prisma 类型适配）
  - `test/modules/requirements/requirement.service.test.ts` — 8 个新测试
- **关键实现说明：**
  - 测试隔离：`DATABASE_URL=file:./test.db` + `rm -f prisma/test.db` + `prisma db push`（agent 环境拒绝 `--force-reset`），测试前重建 schema 不污染 dev.db。
  - 流转留痕表 Transition 为独立模型，从 草稿→…→开发中 逐段验证门禁而非一步到位。
  - 详情页门禁判定项直接渲染 `checks[]`（失败项带修复动作），满足 PRD 10「失败必须返回失败原因与修复动作」。

## 测试（Tests）

- **执行命令：** `npm test`、`npm run build`、dev server 冒烟
- **测试结果：** 58/58 通过（HARN-001 6 + HARN-002 31 + HARN-004 14 + HARN-003 8）；`npm run build` 通过；冒烟：
  - `POST /api/requirements/REQ-002/transition`（草稿→待澄清）200 ✅
  - 非法流转（待澄清→已关闭）422「非法流转：…不在配置流转表中」✅
  - 详情返回 status/transitions/gates，enterDev 判定正确 ✅

## 验收（Acceptance）

- **验收结论：** 通过
- **验收门禁对照：**
  - 需求创建后编号 REQ-001 起顺序递增、初始状态草稿 ✅（测试）
  - 状态流转走配置化状态机、合法流转留痕、非法流转拒绝且无留痕 ✅（测试 + 冒烟）
  - 进入开发门禁：缺业务价值/缺验收标准/评审未过/未排期均阻断，补齐后放行 ✅（测试）
  - 需求详情聚合评审通过状态 ✅（测试）
  - API 与页面端到端可用 ✅（冒烟）

## 复盘（Retro）

- **遗留问题：** 无
- **改进项：**
  - 状态流转专用子路由与主资源路由分离，避免 `[code]` 上堆叠过多动作，路径即语义。
  - 详情页目标状态下拉目前列出全部状态，非法组合由服务层拦截并回显原因；后续可让 API 返回 `allowedTransitions` 供前端只渲染合法目标。
