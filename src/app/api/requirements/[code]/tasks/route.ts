import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import {
  createTask,
  listTasksByRequirement,
} from '@/modules/tasks/task.service'

/** GET /api/requirements/[code]/tasks — 需求下任务列表 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  try {
    const tasks = await listTasksByRequirement(prisma, code)
    return NextResponse.json({ data: tasks })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '查询失败' }, { status: 404 })
  }
}

/** POST /api/requirements/[code]/tasks — 需求拆分任务 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: '任务标题必填' }, { status: 400 })
  }
  try {
    const task = await createTask(prisma, code, {
      title: body.title,
      type: body.type,
      assignee: body.assignee ?? undefined,
      estimate: body.estimate != null ? Number(body.estimate) : undefined,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : undefined,
    })
    return NextResponse.json({ data: task }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '创建失败' }, { status: 422 })
  }
}
