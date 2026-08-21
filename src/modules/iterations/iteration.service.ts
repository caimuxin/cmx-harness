/**
 * 迭代与计划服务（PRD 8.4）
 *
 * - 创建迭代：开始日期、结束日期、目标、团队容量
 * - 需求加入迭代：仅已通过业务+技术评审的需求可加入（未评审阻断/提醒）
 * - 迭代看板聚合：计划工作 / 已完成工作 / 阻塞工作 / 结转工作
 *
 * 依赖方向：modules -> domain -> (无)。评审通过状态由 gate-rules.reviewApproved 计算。
 */

import { PrismaClient } from '@prisma/client'
import { reviewApproved } from '../../domain/gate-rules'

export interface CreateIterationInput {
  name: string
  startDate: Date
  endDate: Date
  goal?: string
  capacity?: number
}

/** 创建迭代 */
export async function createIteration(prisma: PrismaClient, input: CreateIterationInput) {
  if (!input.name.trim()) throw new Error('迭代名称必填')
  if (input.startDate > input.endDate) throw new Error('开始日期不能晚于结束日期')
  return prisma.iteration.create({ data: input })
}

/** 迭代列表 */
export async function listIterations(prisma: PrismaClient) {
  return prisma.iteration.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { requirements: true } } },
  })
}

/** 迭代详情（含需求列表） */
export async function getIteration(prisma: PrismaClient, id: string) {
  const iteration = await prisma.iteration.findUnique({
    where: { id },
    include: { requirements: { orderBy: { createdAt: 'asc' } } },
  })
  if (!iteration) throw new Error(`迭代不存在: ${id}`)
  return iteration
}

/**
 * 需求加入迭代（PRD 8.4.2 / 8.4.6）
 * - 仅已通过业务评审 + 技术评审的需求可加入（未评审加入属错误用法）
 * - 未通过评审时返回明确的未通过评审项（阻断 + 修复动作）
 */
export async function addRequirementToIteration(
  prisma: PrismaClient,
  iterationId: string,
  requirementCode: string,
) {
  const iteration = await prisma.iteration.findUnique({ where: { id: iterationId } })
  if (!iteration) throw new Error(`迭代不存在: ${iterationId}`)

  const requirement = await prisma.requirement.findUnique({
    where: { code: requirementCode },
    include: { reviews: true },
  })
  if (!requirement) throw new Error(`需求不存在: ${requirementCode}`)

  const bizApproved = reviewApproved(requirement.reviews, 'business')
  const techApproved = reviewApproved(requirement.reviews, 'tech')
  if (!bizApproved || !techApproved) {
    const missing: string[] = []
    if (!bizApproved) missing.push('业务评审未通过（修复：完成业务评审并标记通过）')
    if (!techApproved) missing.push('技术评审未通过（修复：完成技术评审并标记通过）')
    throw new Error(`需求 ${requirementCode} 尚未通过全部评审，不能加入迭代：${missing.join('；')}`)
  }

  // 已在该迭代中则幂等返回
  if (requirement.iterationId === iterationId) return requirement

  // 从其他迭代移入时（结转），创建留痕记录供看板归类使用
  if (requirement.iterationId && requirement.iterationId !== iterationId) {
    await prisma.transition.create({
      data: {
        requirementId: requirement.id,
        from: requirement.status,
        to: '已排期',
        actor: 'system',
        reason: `结转：从迭代 ${requirement.iterationId} 移入`,
      },
    })
  }

  return prisma.requirement.update({
    where: { code: requirementCode },
    data: { iterationId },
  })
}

/** 需求移出迭代 */
export async function removeRequirementFromIteration(
  prisma: PrismaClient,
  iterationId: string,
  requirementCode: string,
) {
  const requirement = await prisma.requirement.findUnique({ where: { code: requirementCode } })
  if (!requirement) throw new Error(`需求不存在: ${requirementCode}`)
  if (requirement.iterationId !== iterationId) throw new Error(`需求 ${requirementCode} 不在该迭代中`)
  return prisma.requirement.update({
    where: { code: requirementCode },
    data: { iterationId: null },
  })
}

/** 单条需求的看板归类 */
export type BoardBucket = 'planned' | 'completed' | 'blocked' | 'carried'

/** 按状态归类：计划工作（未完成且未阻塞）、已完成工作、阻塞工作、结转工作（上迭代未完成） */
export function bucketOf(status: string, carried: boolean): BoardBucket {
  if (status === '阻塞') return 'blocked'
  if (status === '已完成' || status === '已关闭' || status === '取消') return 'completed'
  if (carried) return 'carried'
  return 'planned'
}

/**
 * 迭代看板聚合（PRD 8.4.5）
 * - planned：未完成、未阻塞的进行中工作
 * - completed：已完成 / 已关闭 / 已取消
 * - blocked：阻塞
 * - carried：结转工作（需求上一个迭代创建，本迭代仍处于进行中）
 */
export async function iterationBoard(prisma: PrismaClient, iterationId: string) {
  const iteration = await getIteration(prisma, iterationId)
  const carryoverIds = await prisma.transition
    .findMany({
      where: {
        requirementId: { in: iteration.requirements.map((r) => r.id) },
        to: '已排期',
      },
      select: { requirementId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.requirementId)))

  const buckets = { planned: [], completed: [], blocked: [], carried: [] } as Record<
    BoardBucket,
    Array<{
      id: string
      code: string
      title: string
      status: string
      priority: string
      taskCount: number
    }>
  >

  for (const req of iteration.requirements) {
    const bucket = bucketOf(req.status, carryoverIds.has(req.id))
    const taskCount = await prisma.task.count({ where: { requirementId: req.id } })
    buckets[bucket].push({
      id: req.id,
      code: req.code,
      title: req.title,
      status: req.status,
      priority: req.priority,
      taskCount,
    })
  }

  return {
    iteration: {
      id: iteration.id,
      name: iteration.name,
      startDate: iteration.startDate,
      endDate: iteration.endDate,
      goal: iteration.goal,
      capacity: iteration.capacity,
    },
    buckets,
    total: iteration.requirements.length,
  }
}
