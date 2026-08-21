import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { iterationBoard } from '@/modules/iterations/iteration.service'

/** GET /api/iterations/[id] — 迭代看板 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const board = await iterationBoard(prisma, id)
    return NextResponse.json({ data: board })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '迭代不存在' }, { status: 404 })
  }
}
