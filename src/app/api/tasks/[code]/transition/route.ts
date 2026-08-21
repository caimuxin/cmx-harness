import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { transitionTask } from '@/modules/tasks/task.service'

/** POST /api/tasks/[code]/transition — 任务状态流转 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => null)
  const to = body?.to
  const actor = body?.actor ?? 'system'
  const reason = body?.reason
  if (!to || !reason) {
    return NextResponse.json({ error: 'to 与 reason 必填' }, { status: 400 })
  }
  try {
    const task = await transitionTask(prisma, code, to, { actor, reason })
    return NextResponse.json({ data: task })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '流转失败' }, { status: 422 })
  }
}
