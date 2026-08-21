import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getTask } from '@/modules/tasks/task.service'

/** GET /api/tasks/[code] — 任务详情（含流转留痕、所属需求） */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const task = await getTask(prisma, code)
  if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  return NextResponse.json({ data: task })
}
