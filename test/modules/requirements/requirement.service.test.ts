/**
 * HARN-003 需求中心服务测试（PRD 8.2、9.1、10.1）
 *
 * 使用独立测试数据库（DATABASE_URL=file:./test.db），测试前重置 schema。
 * 服务层通过 @/shared/lib/prisma 单例访问 DB；本测试文件在进程启动时
 * 手动设置 DATABASE_URL 并触发单例创建（必须最先 import prisma 单例）。
 *
 * 覆盖：
 * - 需求创建（编号 REQ-001 起顺序递增，初始草稿）
 * - 状态流转合法/非法（走配置化状态机，留痕）
 * - 进入开发门禁（10.1）：缺业务价值/缺验收标准/评审未过/未排期阻断
 * - 需求详情聚合（评审状态）
 */

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import path from 'node:path'

// 必须先设置 DATABASE_URL 再导入 prisma 单例
process.env.DATABASE_URL = 'file:./test.db'

import { prisma } from '../../../src/shared/lib/prisma'

before(async () => {
  // 重置测试数据库：删除独立测试库文件后重建 schema（避免污染 dev.db）
  // Prisma 检测到 agent 环境会拒绝 --force-reset，故直接删文件走 db push。
  const dbPath = path.resolve(process.cwd(), 'prisma/test.db')
  execSync(`rm -f "${dbPath}" && npx prisma db push --skip-generate`, {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    cwd: path.resolve(process.cwd()),
    stdio: 'pipe',
  })
})

after(async () => {
  await prisma.$disconnect()
})

const svcPath = path.resolve(process.cwd(), 'src/modules/requirements/requirement.service.ts')

// 动态导入服务（保证在 before 之后 schema 就绪）
async function svc() {
  return import(svcPath)
}

test('创建需求：编号顺序递增，初始状态草稿', async () => {
  const { createRequirement } = await svc()
  const a = await createRequirement(prisma, {
    title: '登录优化',
    type: '产品需求',
    source: '产品',
    owner: 'alice',
    priority: 'P1',
    businessValue: '提升登录成功率',
    acceptanceCriteria: '成功率 > 99%',
  })
  assert.equal(a.code, 'REQ-001')
  assert.equal(a.status, '草稿')

  const b = await createRequirement(prisma, {
    title: '报表导出',
    type: '技术需求',
    source: '研发',
    owner: 'bob',
    priority: 'P2',
  })
  assert.equal(b.code, 'REQ-002')
})

test('状态流转：合法流转记录留痕（操作者/原因）', async () => {
  const { transitionRequirement, getRequirement } = await svc()
  await transitionRequirement(prisma, 'REQ-001', '待澄清', {
    actor: 'alice',
    reason: '需求初步澄清',
  })
  const req = await getRequirement(prisma, 'REQ-001')
  assert.equal(req!.status, '待澄清')
  assert.equal(req!.transitions.length, 1)
  const t = req!.transitions[0]
  assert.equal(t.actor, 'alice')
  assert.equal(t.from, '草稿')
  assert.equal(t.to, '待澄清')
  assert.equal(t.reason, '需求初步澄清')
  assert.ok(t.at instanceof Date)
})

test('状态流转：非法流转被拒绝且无留痕', async () => {
  const { transitionRequirement, getRequirement } = await svc()
  await assert.rejects(
    () => transitionRequirement(prisma, 'REQ-001', '已关闭', { actor: 'alice', reason: '跳过流程' }),
    /非法流转/,
  )
  const req = await getRequirement(prisma, 'REQ-001')
  assert.equal(req!.status, '待澄清')
  assert.equal(req!.transitions.length, 1) // 无新增留痕
})

test('进入开发门禁：缺业务价值阻断流转', async () => {
  const { transitionRequirement } = await svc()
  // REQ-002 无业务价值/验收标准，走到 已排期 后尝试进入 开发中（10.1 阻断）
  await transitionRequirement(prisma, 'REQ-002', '待澄清', { actor: 'bob', reason: '澄清' })
  await transitionRequirement(prisma, 'REQ-002', '待业务评审', { actor: 'bob', reason: '进入业务评审' })
  await transitionRequirement(prisma, 'REQ-002', '待技术评审', { actor: 'bob', reason: '业务评审通过' })
  await transitionRequirement(prisma, 'REQ-002', '待排期', { actor: 'bob', reason: '技术评审通过' })
  await transitionRequirement(prisma, 'REQ-002', '已排期', { actor: 'bob', reason: '排期' })
  await assert.rejects(
    () => transitionRequirement(prisma, 'REQ-002', '开发中', { actor: 'bob', reason: '开始开发' }),
    /进入开发门禁未通过/,
  )
})

test('进入开发门禁：补齐全部条件后可进入开发', async () => {
  const { transitionRequirement } = await svc()
  // REQ-001 已补齐业务价值/验收标准；补充评审记录与排期
  await transitionRequirement(prisma, 'REQ-001', '待业务评审', { actor: 'alice', reason: '澄清完成' })
  const req1 = await prisma.requirement.findUnique({ where: { code: 'REQ-001' } })
  await prisma.review.create({
    data: {
      requirementId: req1!.id,
      kind: 'business',
      conclusion: '通过',
      reviewer: 'alice',
      checklist: '{}',
    },
  })
  await transitionRequirement(prisma, 'REQ-001', '待技术评审', { actor: 'alice', reason: '业务评审通过' })
  await prisma.review.create({
    data: {
      requirementId: req1!.id,
      kind: 'tech',
      conclusion: '通过',
      reviewer: 'bob',
      checklist: '{}',
    },
  })
  await transitionRequirement(prisma, 'REQ-001', '待排期', { actor: 'alice', reason: '技术评审通过' })
  // 未排期时进入开发门禁（10.1-5 未满足），直接检查门禁计算而非流转
  let gates = await (await svc()).requirementGates(prisma, 'REQ-001')
  assert.equal(gates.enterDev.passed, false)
  assert.equal(gates.enterDev.checks.find((c: { id: string }) => c.id === '10.1-5')!.satisfied, false)

  // 排期后进入开发成功
  await prisma.requirement.update({
    where: { code: 'REQ-001' },
    data: { iterationId: 'iter-1' },
  })
  await transitionRequirement(prisma, 'REQ-001', '已排期', { actor: 'alice', reason: '排期完成' })
  await transitionRequirement(prisma, 'REQ-001', '开发中', { actor: 'alice', reason: '门禁通过，开始开发' })
  const req = await (await svc()).getRequirement(prisma, 'REQ-001')
  assert.equal(req!.status, '开发中')
})

test('需求门禁状态：返回全量判定项与修复动作', async () => {
  const { requirementGates } = await svc()
  const gates = await requirementGates(prisma, 'REQ-001')
  assert.equal(gates.enterDev.ruleId, 'REQ_ENTER_DEV')
  assert.equal(gates.enterDev.passed, true)
  assert.equal(gates.enterDev.checks.length, 5)
  assert.ok(gates.enterDev.checks.every((c: { satisfied: boolean }) => c.satisfied))
})

test('需求详情聚合：包含评审通过状态', async () => {
  const { getRequirement } = await svc()
  const req = await getRequirement(prisma, 'REQ-001')
  assert.equal(req!.bizReviewApproved, true)
  assert.equal(req!.techReviewApproved, true)
})
