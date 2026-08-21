import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getRequirement, updateRequirement, requirementGates } from '@/modules/requirements/requirement.service'

/** GET /api/requirements/[code] — 需求详情 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const [requirement, gates] = await Promise.all([
    getRequirement(prisma, code),
    requirementGates(prisma, code),
  ])
  if (!requirement) return NextResponse.json({ error: '需求不存在' }, { status: 404 })
  return NextResponse.json({ data: requirement, gates })
}

/** PATCH /api/requirements/[code] — 编辑需求字段 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '请求体无效' }, { status: 400 })
  const requirement = await updateRequirement(prisma, code, body)
  return NextResponse.json({ data: requirement })
}
