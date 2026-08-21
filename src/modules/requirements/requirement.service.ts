/**
 * 需求中心服务（PRD 8.2、9.1、10.1）
 *
 * - 需求数据存储与查询（Prisma）
 * - 状态流转：走配置化状态机（I-8），每次流转留痕（I-5）
 * - 进入开发门禁：10.1 判定 + 阻断/展示
 *
 * 依赖方向：modules -> domain -> (无)；本模块是 Prisma 与领域纯逻辑的粘合层。
 */

import { PrismaClient } from '@prisma/client'
import {
  requirementStateMachine,
} from '../../domain/state-machine-config'
import { transition } from '../../domain/state-machine'
import {
  evaluateRequirementEnterDev,
  evaluateRequirementClose,
  reviewApproved,
  requirementCloseInput,
} from '../../domain/gate-rules'
import { RequirementStatus } from '../../domain/models'

export const REQUIREMENT_STATUS = RequirementStatus

/** 生成需求编号：REQ-001 起顺序递增 */
export async function nextRequirementCode(prisma: PrismaClient): Promise<string> {
  const last = await prisma.requirement.findFirst({
    orderBy: { code: 'desc' },
    select: { code: true },
  })
  const n = last ? parseInt(last.code.replace('REQ-', ''), 10) + 1 : 1
  return `REQ-${String(n).padStart(3, '0')}`
}

export interface CreateRequirementInput {
  title: string
  type: string
  source: string
  owner: string
  priority: string
  businessValue?: string
  acceptanceCriteria?: string
  targetDate?: Date
}

/** 创建需求（初始状态：草稿） */
export async function createRequirement(prisma: PrismaClient, input: CreateRequirementInput) {
  const code = await nextRequirementCode(prisma)
  return prisma.requirement.create({
    data: {
      code,
      title: input.title,
      type: input.type,
      source: input.source,
      owner: input.owner,
      priority: input.priority,
      businessValue: input.businessValue,
      acceptanceCriteria: input.acceptanceCriteria,
      targetDate: input.targetDate,
      status: REQUIREMENT_STATUS.DRAFT,
    },
  })
}

/** 需求详情（含状态流转留痕、关联评审） */
export async function getRequirement(prisma: PrismaClient, code: string) {
  const req = await prisma.requirement.findUnique({
    where: { code },
    include: { transitions: true, reviews: true },
  })
  if (!req) return null
  return {
    ...req,
    bizReviewApproved: reviewApproved(req.reviews, 'business'),
    techReviewApproved: reviewApproved(req.reviews, 'tech'),
  }
}

/** 需求列表 */
export async function listRequirements(prisma: PrismaClient) {
  return prisma.requirement.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

/** 编辑需求（非状态字段） */
export async function updateRequirement(
  prisma: PrismaClient,
  code: string,
  input: Partial<Omit<CreateRequirementInput, 'title'>> & { title?: string },
) {
  return prisma.requirement.update({
    where: { code },
    data: input,
  })
}

export interface TransitionRequirementInput {
  actor: string
  reason: string
}

/**
 * 需求状态流转（I-5 / I-8）
 * - 走配置化状态机校验，非法流转拒绝
 * - 每次流转落 Transition 留痕
 * - 特殊门禁：目标状态为「开发中」时执行 10.1 门禁；为「已关闭」时执行 10.4 门禁
 */
export async function transitionRequirement(
  prisma: PrismaClient,
  code: string,
  to: string,
  input: TransitionRequirementInput,
) {
  const req = await prisma.requirement.findUnique({
    where: { code },
    include: { transitions: true, reviews: true, tasks: true, acceptances: true },
  })
  if (!req) throw new Error(`需求不存在: ${code}`)

  const from = req.status
  const t = transition(
    { config: requirementStateMachine },
    { from, to, actor: input.actor, reason: input.reason },
  )
  if (!t.ok) throw new Error(t.error)

  // 进入开发门禁（10.1）
  if (to === REQUIREMENT_STATUS.DEVELOPING) {
    const gate = evaluateRequirementEnterDev({
      businessValue: req.businessValue ?? undefined,
      acceptanceCriteria: req.acceptanceCriteria ?? undefined,
      bizReviewApproved: reviewApproved(req.reviews, 'business'),
      techReviewApproved: reviewApproved(req.reviews, 'tech'),
      planned: req.iterationId != null,
    })
    if (!gate.passed) {
      throw new Error(
        `需求进入开发门禁未通过：${gate.checks.filter((c) => !c.satisfied).map((c) => `${c.id} ${c.description}（修复：${c.fixAction}）`).join('；')}`,
      )
    }
  }

  // 关闭门禁（10.4）
  if (to === REQUIREMENT_STATUS.CLOSED) {
    const latestAcceptance = req.acceptances[req.acceptances.length - 1]
    const release = req.releaseId
      ? await prisma.releaseTicket.findUnique({ where: { id: req.releaseId } })
      : null
    const gate = evaluateRequirementClose(
      requirementCloseInput(
        req,
        latestAcceptance,
        release ?? undefined,
        false,
        false,
      ),
    )
    if (!gate.passed) {
      throw new Error(
        `需求关闭门禁未通过：${gate.checks.filter((c) => !c.satisfied).map((c) => `${c.id} ${c.description}（修复：${c.fixAction}）`).join('；')}`,
      )
    }
  }

  const updated = await prisma.$transaction([
    prisma.requirement.update({
      where: { code },
      data: { status: to },
    }),
    prisma.transition.create({
      data: {
        actor: input.actor,
        from,
        to,
        reason: input.reason,
        requirementId: req.id,
      },
    }),
  ])
  return updated[0]
}

/** 需求门禁状态（详情页展示：10.1 进入开发 / 10.4 关闭） */
export async function requirementGates(prisma: PrismaClient, code: string) {
  const req = await prisma.requirement.findUnique({
    where: { code },
    include: { reviews: true, acceptances: true },
  })
  if (!req) throw new Error(`需求不存在: ${code}`)

  const enterDev = evaluateRequirementEnterDev({
    businessValue: req.businessValue ?? undefined,
    acceptanceCriteria: req.acceptanceCriteria ?? undefined,
    bizReviewApproved: reviewApproved(req.reviews, 'business'),
    techReviewApproved: reviewApproved(req.reviews, 'tech'),
    planned: req.iterationId != null,
  })

  const latestAcceptance = req.acceptances[req.acceptances.length - 1]
  const release = req.releaseId
    ? await prisma.releaseTicket.findUnique({ where: { id: req.releaseId } })
    : null
  const close = evaluateRequirementClose(
    requirementCloseInput(req, latestAcceptance, release ?? undefined, false, false),
  )

  return { enterDev, close }
}
