/**
 * 门禁规则引擎（PRD 10：触发条件 -> 判定 -> 失败处理）
 *
 * 四条门禁：
 * - 10.1 需求进入开发门禁
 * - 10.2 Pull Request 合并门禁
 * - 10.3 发布门禁
 * - 10.4 需求关闭门禁
 *
 * 门禁失败必须返回失败原因与修复动作（PRD 10 引言）。
 * 门禁只判断不替代（I-3）：实际合并阻断由 GitHub Branch Protection 执行。
 *
 * I-8 流程即配置：判定项列表本身是可配置数据（GateCheck 数组），
 * HARN-014 配置中心可覆盖；本模块只提供默认计算函数。
 */

import type {
  Acceptance,
  Defect,
  GateResult,
  ReleaseTicket,
  Requirement,
  RequirementGateInput,
  Review,
  Task,
} from './models'

/** 构建一条判定项 */
function check(id: string, description: string, satisfied: boolean, fixAction: string) {
  return { id, description, satisfied, fixAction }
}

/** 汇总判定项为门禁结果 */
function result(ruleId: string, checks: GateResult['checks']): GateResult {
  return { ruleId, passed: checks.every((c) => c.satisfied), checks }
}

/**
 * 10.1 需求进入开发门禁
 * 触发：需求尝试流转到「开发中」
 * 判定：业务价值 / 验收标准 / 业务评审通过 / 技术评审通过 / 已进入迭代计划
 */
export function evaluateRequirementEnterDev(
  req: Pick<Requirement, 'businessValue' | 'acceptanceCriteria'> & RequirementGateInput,
): GateResult {
  const checks = [
    check('10.1-1', '业务价值已填写', Boolean(req.businessValue?.trim()), '补充业务价值'),
    check('10.1-2', '验收标准已填写', Boolean(req.acceptanceCriteria?.trim()), '补充验收标准'),
    check('10.1-3', '业务评审已通过', req.bizReviewApproved === true, '完成业务评审并标记通过'),
    check('10.1-4', '技术评审已通过', req.techReviewApproved === true, '完成技术评审并标记通过'),
    check('10.1-5', '需求已进入迭代计划', req.planned === true, '将需求纳入迭代计划'),
  ]
  return result('REQ_ENTER_DEV', checks)
}

/**
 * 10.2 Pull Request 合并门禁
 * 触发：平台展示 PR 合并就绪状态（PR 或检查状态每次变化时重新计算）
 * 判定：关联需求与任务 / 至少 1 名评审人通过 / 必需 Actions 检查成功 / 自动化测试通过 / 无未关闭阻塞缺陷
 * 说明：平台只计算展示，实际阻断由 GitHub Branch Protection 执行（I-3、R-5）
 */
export function evaluatePrMerge(input: {
  linkedToRequirementAndTask: boolean
  reviewerApproved: boolean
  requiredChecksPassed: boolean
  automatedTestsPassed: boolean
  openBlockingDefects: number
}): GateResult {
  const checks = [
    check('10.2-1', 'PR 已关联需求与任务', input.linkedToRequirementAndTask, '将 PR 关联到需求与任务'),
    check('10.2-2', '至少 1 名评审人已通过', input.reviewerApproved, '获得至少 1 名评审人通过'),
    check('10.2-3', '必需的 GitHub Actions 检查已成功', input.requiredChecksPassed, '修复 CI 失败并重新运行'),
    check('10.2-4', '自动化测试已通过', input.automatedTestsPassed, '修复失败的自动化测试'),
    check('10.2-5', '无未关闭阻塞缺陷', input.openBlockingDefects === 0, '修复或关闭阻塞缺陷'),
  ]
  return result('PR_MERGE', checks)
}

/**
 * 10.3 发布门禁
 * 触发：发布单申请执行「部署」动作
 * 判定：审批完成 / 包含需求测试通过 / 阻塞缺陷为 0 / 已选制品或 commit SHA / 已选环境 / 已填回滚方案
 */
export function evaluateRelease(input: {
  approved: boolean
  requirementsTestedPassed: boolean
  openBlockingDefects: number
  artifact: string | undefined
  environment: string | undefined
  rollbackPlan: string | undefined
}): GateResult {
  const checks = [
    check('10.3-1', '发布审批已完成', input.approved, '完成发布审批'),
    check('10.3-2', '发布包含的需求均已测试通过', input.requirementsTestedPassed, '完成需求相关测试'),
    check('10.3-3', '阻塞缺陷数量为 0', input.openBlockingDefects === 0, '修复或关闭阻塞缺陷'),
    check('10.3-4', '已选择制品版本或 commit SHA', Boolean(input.artifact?.trim()), '选择制品版本或 commit SHA'),
    check('10.3-5', '已选择部署环境', Boolean(input.environment?.trim()), '选择部署环境'),
    check('10.3-6', '已填写回滚方案', Boolean(input.rollbackPlan?.trim()), '填写回滚方案'),
  ]
  return result('RELEASE', checks)
}

/**
 * 10.4 需求关闭门禁
 * 触发：需求申请流转到「已关闭」
 * 判定：生产验证通过 / 业务验收通过或有明确例外原因 / 发布结果已记录 / 度量已生成或明确标记数据不足
 */
export function evaluateRequirementClose(input: {
  productionVerified: boolean
  businessAccepted: boolean
  exceptionReason?: string
  releaseRecorded: boolean
  metricsReady: boolean
  metricsInsufficientData: boolean
}): GateResult {
  const checks = [
    check('10.4-1', '生产验证已通过', input.productionVerified, '完成生产验证'),
    check(
      '10.4-2',
      '业务验收已通过或已记录明确例外原因',
      input.businessAccepted || Boolean(input.exceptionReason?.trim()),
      '完成业务验收或记录明确例外原因',
    ),
    check('10.4-3', '发布结果已记录', input.releaseRecorded, '记录发布结果'),
    check(
      '10.4-4',
      '需求相关度量已生成或明确标记数据不足',
      input.metricsReady || input.metricsInsufficientData,
      '生成需求相关度量或明确标记数据不足',
    ),
  ]
  return result('REQ_CLOSE', checks)
}

// ---- 门禁辅助：从领域对象聚合输入 ------------------------------------------

/** 从评审记录判断业务/技术评审是否通过（按需求聚合最新结论） */
export function reviewApproved(
  reviews: Array<{ kind: string; conclusion: string }>,
  kind: 'business' | 'tech',
): boolean {
  const kindReviews = reviews.filter((r) => r.kind === kind)
  if (kindReviews.length === 0) return false
  // 最新一次评审结论为「通过」即视为通过
  const latest = kindReviews[kindReviews.length - 1]
  return latest.conclusion === '通过'
}

/** 未关闭（非 已关闭）的阻塞缺陷计数 */
export function openBlockingDefects(defects: Defect[]): number {
  return defects.filter((d) => d.blocking && d.status !== '已关闭').length
}

/** 任务是否全部进入已终态（已完成/取消）——用于 10.3-2 的近似聚合 */
export function requirementsTestedPassed(tasks: Task[]): boolean {
  if (tasks.length === 0) return false
  return tasks.every((t) => t.status === '已完成' || t.status === '取消')
}

/** 需求是否有关联发布记录（10.4-3） */
export function hasReleaseRecorded(release?: { status?: string }): boolean {
  return release !== undefined && release.status !== '草稿'
}

/** 需求关闭门禁输入聚合（生产验证+业务验收来自验收记录） */
export function requirementCloseInput(
  req: { releaseId?: string | null },
  acceptance?: { productionVerified?: boolean; result?: string; id?: string },
  release?: { status?: string },
  metricsReady = false,
  metricsInsufficientData = false,
) {
  return {
    productionVerified: acceptance?.productionVerified === true,
    businessAccepted: acceptance?.result === '通过',
    exceptionReason: acceptance?.result === '需跟进' ? acceptance.id : undefined,
    releaseRecorded: hasReleaseRecorded(release),
    metricsReady,
    metricsInsufficientData,
  }
}
