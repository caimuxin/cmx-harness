import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import {
  createRequirement,
  listRequirements,
} from '@/modules/requirements/requirement.service'

/** GET /api/requirements — 需求列表 */
export async function GET() {
  const list = await listRequirements(prisma)
  return NextResponse.json({ data: list })
}

/** POST /api/requirements — 创建需求 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: '标题必填' }, { status: 400 })
  }
  const requirement = await createRequirement(prisma, body)
  return NextResponse.json({ data: requirement }, { status: 201 })
}
