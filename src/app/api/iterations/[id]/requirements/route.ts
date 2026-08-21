import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import {
  addRequirementToIteration,
  removeRequirementFromIteration,
} from '@/modules/iterations/iteration.service'

/** PUT /api/iterations/[id]/requirements — 需求加入迭代（body: { requirementCode }） */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const requirementCode = body?.requirementCode
  if (!requirementCode) {
    return NextResponse.json({ error: 'requirementCode 必填' }, { status: 400 })
  }
  try {
    const requirement = await addRequirementToIteration(prisma, id, requirementCode)
    return NextResponse.json({ data: requirement })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '加入迭代失败' }, { status: 422 })
  }
}

/** DELETE /api/iterations/[id]/requirements — 需求移出迭代（body: { requirementCode }） */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const requirementCode = body?.requirementCode
  if (!requirementCode) {
    return NextResponse.json({ error: 'requirementCode 必填' }, { status: 400 })
  }
  try {
    const requirement = await removeRequirementFromIteration(prisma, id, requirementCode)
    return NextResponse.json({ data: requirement })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '移出迭代失败' }, { status: 422 })
  }
}
