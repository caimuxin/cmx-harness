/**
 * 核心领域对象（PRD 8：功能模块；PRD 9：状态机）
 *
 * 所有对象承载 Status 字段 + 状态流转留痕（I-5）。
 * 枚举值严格对齐 PRD 8.x 与 9.x 的原文，不得自行增删。
 */

import type { ObjectId, StateTransitionRecord } from './types'

// ---- 需求（PRD 8.2、9.1） -------------------------------------------------

/** 需求类型（PRD 8.2） */
export const RequirementType = {
  BUSINESS: '业务需求',
  PRODUCT: '产品需求',
  TECHNICAL: '技术需求',
  DEFECT: '缺陷',
  COMPLIANCE: '合规需求',
  OPERATIONS: '运维需求',
} as const
export type RequirementType = (typeof RequirementType)[keyof typeof RequirementType]

/** 需求优先级（PRD 8.2） */
export const Priority = { P0: 'P0', P1: 'P1', P2: 'P2', P3: 'P3' } as const
export type Priority = (typeof Priority)[keyof typeof Priority]

/** 需求来源（PRD 8.2：业务、产品、客户、事故、监管、研发） */
export const RequirementSource = {
  BUSINESS: '业务',
  PRODUCT: '产品',
  CUSTOMER: '客户',
  INCIDENT: '事故',
  REGULATORY: '监管',
  R_D: '研发',
} as const
export type RequirementSource = (typeof RequirementSource)[keyof typeof RequirementSource]

/** 需求状态（PRD 9.1 主流转 + 异常状态） */
export const RequirementStatus = {
  DRAFT: '草稿',
  NEED_CLARIFY: '待澄清',
  NEED_BIZ_REVIEW: '待业务评审',
  NEED_TECH_REVIEW: '待技术评审',
  NEED_PLAN: '待排期',
  PLANNED: '已排期',
  DEVELOPING: '开发中',
  TESTING: '测试中',
  READY_RELEASE: '待发布',
  RELEASED: '已发布',
  NEED_ACCEPT: '待验收',
  CLOSED: '已关闭',
  // 异常状态（PRD 9.1）
  NEED_SUPPLEMENT: '需补充',
  BLOCKED: '阻塞',
  SUSPENDED: '挂起',
  CANCELLED: '取消',
  REJECTED: '驳回',
} as const
export type RequirementStatus = (typeof RequirementStatus)[keyof typeof RequirementStatus]

/** 需求对象（PRD 8.2 核心字段） */
export interface Requirement {
  id: ObjectId
  title: string
  type: RequirementType
  source: RequirementSource
  owner: string
  priority: Priority
  /** 业务价值：为什么要做（10.1 门禁判定项 1） */
  businessValue?: string
  /** 验收标准：需求完成的判断条件（10.1 门禁判定项 2） */
  acceptanceCriteria?: string
  /** 目标日期：期望日期，不等同于交付承诺 */
  targetDate?: Date
  status: RequirementStatus
  /** 关联迭代 */
  iterationId?: ObjectId
  /** 关联发布单 */
  releaseId?: ObjectId
  /** 状态流转留痕（I-5） */
  transitions: StateTransitionRecord[]
}

// ---- 任务（PRD 8.5、9.2） -------------------------------------------------

/** 任务状态（PRD 8.5 / 9.2 主流转 + 异常状态） */
export const TaskStatus = {
  TODO: '待处理',
  IN_PROGRESS: '进行中',
  NEED_CODE_REVIEW: '待代码评审',
  NEED_BUILD: '待构建',
  NEED_TEST: '待测试',
  DONE: '已完成',
  // 异常状态
  BLOCKED: '阻塞',
  RETURNED: '退回',
  CANCELLED: '取消',
} as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

/** 任务类型（PRD 8.5.1：开发、测试、文档、部署、调研等） */
export const TaskType = {
  DEV: '开发',
  TEST: '测试',
  DOC: '文档',
  DEPLOY: '部署',
  RESEARCH: '调研',
} as const
export type TaskType = (typeof TaskType)[keyof typeof TaskType]

export interface Task {
  id: ObjectId
  requirementId: ObjectId
  title: string
  type: TaskType
  assignee?: string
  estimate?: number
  plannedDate?: Date
  status: TaskStatus
  transitions: StateTransitionRecord[]
}

// ---- 评审（PRD 8.3） ------------------------------------------------------

/** 评审结论（PRD 8.3） */
export const ReviewConclusion = {
  APPROVED: '通过',
  REJECTED: '驳回',
  NEED_SUPPLEMENT: '需补充',
  DEFERRED: '延期',
} as const
export type ReviewConclusion = (typeof ReviewConclusion)[keyof typeof ReviewConclusion]

export interface Review {
  id: ObjectId
  requirementId: ObjectId
  /** 评审类型：业务 / 技术 */
  kind: 'business' | 'tech'
  conclusion: ReviewConclusion
  reviewer: string
  /** 业务评审检查项 / 技术评审检查项（PRD 8.3） */
  checklist: Record<string, boolean>
  /** 意见与结论说明 */
  comment?: string
  at: Date
}

// ---- 迭代（PRD 8.4） ------------------------------------------------------

export interface Iteration {
  id: ObjectId
  name: string
  startDate: Date
  endDate: Date
  goal?: string
  capacity?: number
}

// ---- 测试（PRD 8.8） ------------------------------------------------------

/** 测试结果状态（PRD 8.8） */
export const TestResultStatus = {
  NOT_RUN: '未执行',
  PASSED: '通过',
  FAILED: '失败',
  BLOCKED: '阻塞',
  SKIPPED: '跳过',
} as const
export type TestResultStatus = (typeof TestResultStatus)[keyof typeof TestResultStatus]

/** 测试用例：关联需求 */
export interface TestCase {
  id: ObjectId
  requirementId: ObjectId
  title: string
  /** 期望结果 */
  expected?: string
  result?: TestResultStatus
}

/** 测试计划：关联迭代或发布 */
export interface TestPlan {
  id: ObjectId
  title: string
  iterationId?: ObjectId
  releaseId?: ObjectId
  cases: TestCase[]
}

// ---- 缺陷（PRD 8.8） ------------------------------------------------------

/** 缺陷状态（PRD 8.8：新建 -> 处理中 -> 已修复 -> 已验证 -> 已关闭） */
export const DefectStatus = {
  OPEN: '新建',
  IN_PROGRESS: '处理中',
  FIXED: '已修复',
  VERIFIED: '已验证',
  CLOSED: '已关闭',
} as const
export type DefectStatus = (typeof DefectStatus)[keyof typeof DefectStatus]

/** 缺陷：追踪链路锚定需求（I-4），可关联任务/测试用例/PR */
export interface Defect {
  id: ObjectId
  requirementId: ObjectId
  taskId?: ObjectId
  testCaseId?: ObjectId
  prId?: ObjectId
  title: string
  /** 阻塞缺陷：存在时阻止发布（10.3 门禁判定项 3） */
  blocking: boolean
  status: DefectStatus
  transitions: StateTransitionRecord[]
}

// ---- 发布（PRD 8.9、9.3） -------------------------------------------------

/** 发布单状态（PRD 8.9 / 9.3 主流转 + 异常状态） */
export const ReleaseStatus = {
  DRAFT: '草稿',
  NEED_APPROVAL: '待审批',
  READY_DEPLOY: '待部署',
  DEPLOYING: '部署中',
  NEED_VERIFY: '待验证',
  RELEASED: '已发布',
  CLOSED: '已关闭',
  // 异常状态
  REJECTED: '已驳回',
  DEPLOY_FAILED: '部署失败',
  ROLLED_BACK: '已回滚',
  CANCELLED: '已取消',
} as const
export type ReleaseStatus = (typeof ReleaseStatus)[keyof typeof ReleaseStatus]

export interface ReleaseTicket {
  id: ObjectId
  requirementIds: ObjectId[]
  title: string
  environment?: string
  /** 制品版本或 commit SHA（10.3 门禁判定项 4） */
  artifact?: string
  approver?: string
  /** 回滚方案（10.3 门禁判定项 6） */
  rollbackPlan?: string
  status: ReleaseStatus
  transitions: StateTransitionRecord[]
}

// ---- 部署（PRD 8.9） ------------------------------------------------------

/** 部署状态来源（PRD 5.3 DEFAULT：deployment_status > workflow run > 人工确认） */
export const DeploymentSource = {
  EVENT: 'deployment_status事件',
  WORKFLOW_RUN: 'workflow run',
  MANUAL: '人工记录',
} as const
export type DeploymentSource = (typeof DeploymentSource)[keyof typeof DeploymentSource]

export interface Deployment {
  id: ObjectId
  releaseId: ObjectId
  environment?: string
  status: string
  /** 来源标记（I-2 / R-6） */
  source: DeploymentSource
  at: Date
}

// ---- 验收与复盘（PRD 8.10） ------------------------------------------------

/** 验收结果（PRD 8.10） */
export const AcceptanceResult = {
  PASSED: '通过',
  FAILED: '不通过',
  PARTIAL: '部分通过',
  NEED_FOLLOW_UP: '需跟进',
} as const
export type AcceptanceResult = (typeof AcceptanceResult)[keyof typeof AcceptanceResult]

export interface Acceptance {
  id: ObjectId
  requirementId: ObjectId
  result: AcceptanceResult
  /** 生产验证结果 */
  productionVerified?: boolean
  verifier: string
  at: Date
}

export interface RetrospectiveItem {
  id: ObjectId
  requirementId: ObjectId
  content: string
  owner: string
  followUpDate?: Date
  done: boolean
}

// ---- 门禁规则（PRD 10） ---------------------------------------------------

/** 门禁规则：触发条件 -> 判定 -> 失败处理（PRD 10 引言） */
export interface GateRule {
  /** 门禁标识，对应 PRD 10.1 ~ 10.4 */
  id: 'REQ_ENTER_DEV' | 'PR_MERGE' | 'RELEASE' | 'REQ_CLOSE'
  name: string
  /** 每条判定规则 */
  checks: GateCheck[]
}

export interface GateCheck {
  /** 判定项 ID（例如 PRD 10.1-1） */
  id: string
  /** 判定项描述 */
  description: string
  /** 判定是否满足 */
  satisfied: boolean
  /** 不满足时的修复动作（门禁失败必须返回修复动作，PRD 10 引言） */
  fixAction: string
}

/** 门禁计算结果 */
export interface GateResult {
  ruleId: string
  passed: boolean
  /** 失败原因与修复动作（全量判定项，供 UI 展示） */
  checks: GateCheck[]
}

/** 待排期状态（NeedPlan）在进入开发前需满足的评审依据 */
export interface RequirementGateInput {
  businessValue?: string
  acceptanceCriteria?: string
  bizReviewApproved?: boolean
  techReviewApproved?: boolean
  planned?: boolean
}
