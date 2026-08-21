/**
 * 评审中心（PRD 8.3）
 *
 * 业务评审检查项：
 *   1. 业务价值是否清楚
 *   2. 用户或业务场景是否清楚
 *   3. 范围是否清楚
 *   4. 不做什么是否明确
 *   5. 验收标准是否可测试
 *
 * 技术评审检查项：
 *   1. 技术可行性是否确认
 *   2. 架构影响是否识别
 *   3. 依赖关系是否识别
 *   4. 技术风险是否记录
 *   5. 粗略工作量是否给出
 *   6. 测试和发布影响是否明确
 *
 * 评审结论（PRD 8.3）：通过 / 驳回 / 需补充 / 延期
 */

import type { Review, ReviewConclusion } from '../../domain/models'
import { ReviewConclusion as RC } from '../../domain/models'

/** 业务评审检查项（PRD 8.3） */
export const BUSINESS_CHECKLIST_KEYS = [
  'businessValue',
  'scenario',
  'scope',
  'notDo',
  'acceptanceTestable',
] as const

/** 技术评审检查项（PRD 8.3） */
export const TECH_CHECKLIST_KEYS = [
  'feasibility',
  'archImpact',
  'dependency',
  'techRisk',
  'roughEstimate',
  'testReleaseImpact',
] as const

export type ChecklistKey = (typeof BUSINESS_CHECKLIST_KEYS | typeof TECH_CHECKLIST_KEYS)[number]

/** 检查项中文标签（用于 UI 展示） */
export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  // 业务评审
  businessValue: '业务价值清楚',
  scenario: '用户或业务场景清楚',
  scope: '范围清楚',
  notDo: '不做什么明确',
  acceptanceTestable: '验收标准可测试',
  // 技术评审
  feasibility: '技术可行性确认',
  archImpact: '架构影响识别',
  dependency: '依赖关系识别',
  techRisk: '技术风险记录',
  roughEstimate: '粗略工作量给出',
  testReleaseImpact: '测试和发布影响明确',
}

/** 创建评审记录 */
export function createReview(input: {
  requirementId: string
  kind: 'business' | 'tech'
  conclusion: ReviewConclusion
  reviewer: string
  checklist: Partial<Record<ChecklistKey, boolean>>
  comment?: string
}): Review {
  return {
    id: crypto.randomUUID(),
    requirementId: input.requirementId,
    kind: input.kind,
    conclusion: input.conclusion,
    reviewer: input.reviewer,
    checklist: { ...input.checklist } as Record<string, boolean>,
    comment: input.comment,
    at: new Date(),
  }
}

/** 业务评审检查项是否全部勾选 */
export function businessChecklistComplete(checklist: Record<string, boolean>): boolean {
  return BUSINESS_CHECKLIST_KEYS.every((k) => checklist[k] === true)
}

/** 技术评审检查项是否全部勾选 */
export function techChecklistComplete(checklist: Record<string, boolean>): boolean {
  return TECH_CHECKLIST_KEYS.every((k) => checklist[k] === true)
}

/**
 * 评审结论影响需求状态（PRD 8.3 + 9.1）：
 * - 业务评审通过：待业务评审 -> 待技术评审
 * - 技术评审通过：待技术评审 -> 待排期
 * - 需补充：-> 需补充（回到澄清）
 * - 驳回 / 延期：-> 驳回 / 挂起
 */
export function conclusionToTargetStatus(
  kind: 'business' | 'tech',
  conclusion: ReviewConclusion,
): string | null {
  if (conclusion === RC.APPROVED) {
    return kind === 'business' ? '待技术评审' : '待排期'
  }
  if (conclusion === RC.NEED_SUPPLEMENT) return '需补充'
  if (conclusion === RC.REJECTED) return '驳回'
  if (conclusion === RC.DEFERRED) return '挂起'
  return null
}

/** 当前需求的评审结论（业务/技术各取最新一条） */
export function latestReview(reviews: Review[], kind: 'business' | 'tech'): Review | undefined {
  const filtered = reviews.filter((r) => r.kind === kind)
  return filtered[filtered.length - 1]
}
