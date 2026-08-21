import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { createIteration, listIterations } from '@/modules/iterations/iteration.service'

/** GET /api/iterations — 迭代列表 */
export async function GET() {
  const list = await listIterations(prisma)
  return NextResponse.json({ data: list })
}

/** POST /api/iterations — 创建迭代 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: '迭代名称必填' }, { status: 400 })
  }
  if (!body?.startDate || !body?.endDate) {
    return NextResponse.json({ error: '开始/结束日期必填' }, { status: 400 })
  }
  try {
    const iteration = await createIteration(prisma, {
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      goal: body.goal ?? undefined,
      capacity: body.capacity != null ? Number(body.capacity) : undefined,
    })
    return NextResponse.json({ data: iteration }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '创建失败' }, { status: 422 })
  }
}
