/**
 * 任务中心服务（PRD 8.5、9.2）
 *
 * - 需求拆分任务：开发/测试/文档/部署/调研，负责人、估算、计划日期
 * - 任务状态流转：配置化状态机（I-8）+ 流转留痕（I-5）
 * - 任务详情：含流转留痕、所属需求
 *
 * 依赖方向：modules -> domain -> (无)。流转复用 HARN-002 状态机引擎 transition()。
 */

import { PrismaClient } from '@prisma/client'
import { taskStateMachine } from '../../domain/state-machine-config'
import { transition } from '../../domain/state-machine'
import { TaskStatus } from '../../domain/models'

export const TASK_STATUS = TaskStatus
export const TASK_TYPES = ['开发', '测试', '文档', '部署', '调研'] as const

/** 生成任务编号：TASK-001 起顺序递增 */
export async function nextTaskCode(prisma: PrismaClient): Promise<string> {
  const last = await prisma.task.findFirst({
    orderBy: { code: 'desc' },
    select: { code: true },
  })
  const n = last ? parseInt(last.code.replace('TASK-', ''), 10) + 1 : 1
  return `TASK-${String(n).padStart(3, '0')}`
}

export interface CreateTaskInput {
  title: string
  type: string
  assignee?: string
  estimate?: number
  plannedDate?: Date
}

/** 在需求下创建任务（初始状态：待处理） */
export async function createTask(prisma: PrismaClient, requirementCode: string, input: CreateTaskInput) {
  const requirement = await prisma.requirement.findUnique({ where: { code: requirementCode } })
  if (!requirement) throw new Error(`需求不存在: ${requirementCode}`)
  if (!input.title.trim()) throw new Error('任务标题必填')
  if (!TASK_TYPES.includes(input.type as (typeof TASK_TYPES)[number])) {
    throw new Error(`任务类型不合法: ${input.type}（允许：${TASK_TYPES.join('/')}）`)
  }

  const code = await nextTaskCode(prisma)
  return prisma.task.create({
    data: {
      code,
      requirementId: requirement.id,
      title: input.title,
      type: input.type,
      assignee: input.assignee,
      estimate: input.estimate,
      plannedDate: input.plannedDate,
      status: TASK_STATUS.TODO,
    },
  })
}

/** 需求下任务列表 */
export async function listTasksByRequirement(prisma: PrismaClient, requirementCode: string) {
  const requirement = await prisma.requirement.findUnique({ where: { code: requirementCode } })
  if (!requirement) throw new Error(`需求不存在: ${requirementCode}`)
  return prisma.task.findMany({
    where: { requirementId: requirement.id },
    orderBy: { createdAt: 'asc' },
  })
}

/** 任务详情（含流转留痕、所属需求） */
export async function getTask(prisma: PrismaClient, code: string) {
  const task = await prisma.task.findUnique({
    where: { code },
    include: { transitions: true, requirement: { select: { code: true, title: true } } },
  })
  if (!task) return null
  return task
}

export interface TransitionTaskInput {
  actor: string
  reason: string
}

/** 任务状态流转（I-5 / I-8）：配置化状态机校验 + Transition 留痕，同事务写入 */
export async function transitionTask(
  prisma: PrismaClient,
  code: string,
  to: string,
  input: TransitionTaskInput,
) {
  const task = await prisma.task.findUnique({
    where: { code },
    include: { transitions: true },
  })
  if (!task) throw new Error(`任务不存在: ${code}`)

  const from = task.status
  const t = transition(
    { config: taskStateMachine },
    { from, to, actor: input.actor, reason: input.reason },
  )
  if (!t.ok) throw new Error(t.error)

  const updated = await prisma.$transaction([
    prisma.task.update({
      where: { code },
      data: { status: to },
    }),
    prisma.transition.create({
      data: {
        actor: input.actor,
        from,
        to,
        reason: input.reason,
        taskId: task.id,
      },
    }),
  ])
  return updated[0]
}
