/**
 * HARN-005 迭代与任务服务测试（PRD 8.4、8.5、9.2）
 *
 * 独立测试数据库（DATABASE_URL=file:./test-iter.db），测试前重建 schema。
 * 每个访问 DB 的测试文件使用独立数据库文件，避免跨文件编号互相污染。
 * 必须先设置 DATABASE_URL 再导入 prisma 单例。
 *
 * 覆盖：
 * - 迭代创建（名称/日期校验）与列表
 * - 需求加入迭代：仅评审通过可加入，未评审阻断
 * - 迭代看板聚合：计划/完成/阻塞/结转
 * - 需求拆分任务（TASK-001 起编号、类型校验）
 * - 任务状态流转（配置化状态机 + 留痕）、非法流转拒绝
 */

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import path from 'node:path'

// 必须先设置 DATABASE_URL 再导入 prisma 单例
process.env.DATABASE_URL = 'file:./test-iter.db'

import { prisma } from '../../../src/shared/lib/prisma'

before(async () => {
  const dbPath = path.resolve(process.cwd(), 'prisma/test-iter.db')
  execSync(`rm -f "${dbPath}" && npx prisma db push --skip-generate`, {
    env: { ...process.env, DATABASE_URL: 'file:./test-iter.db' },
    cwd: path.resolve(process.cwd()),
    stdio: 'pipe',
  })
})

after(async () => {
  await prisma.$disconnect()
})

const iterSvc = path.resolve(process.cwd(), 'src/modules/iterations/iteration.service.ts')
const taskSvc = path.resolve(process.cwd(), 'src/modules/tasks/task.service.ts')
const reqSvc = path.resolve(process.cwd(), 'src/modules/requirements/requirement.service.ts')

async function iter() {
  return import(iterSvc)
}
async function tasks() {
  return import(taskSvc)
}
async function reqs() {
  return import(reqSvc)
}

/** 创建一条已通过业务+技术评审的需求 */
async function createReviewedRequirement(code: string, title: string) {
  const { createRequirement } = await reqs()
  await createRequirement(prisma, {
    title,
    type: '产品需求',
    source: '产品',
    owner: 'alice',
    priority: 'P1',
    businessValue: '业务价值',
    acceptanceCriteria: '验收标准',
  })
  const req = await prisma.requirement.findUnique({ where: { code } })
  await prisma.review.create({
    data: { requirementId: req!.id, kind: 'business', conclusion: '通过', reviewer: 'alice', checklist: '{}' },
  })
  await prisma.review.create({
    data: { requirementId: req!.id, kind: 'tech', conclusion: '通过', reviewer: 'bob', checklist: '{}' },
  })
}

test('创建迭代：名称必填、开始不晚于结束', async () => {
  const { createIteration } = await iter()
  const it = await createIteration(prisma, {
    name: '迭代 1',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-14'),
    goal: '完成登录优化',
    capacity: 5,
  })
  assert.equal(it.name, '迭代 1')
  assert.equal(it.goal, '完成登录优化')
  assert.equal(it.capacity, 5)

  await assert.rejects(
    () => createIteration(prisma, { name: '', startDate: new Date(), endDate: new Date() }),
    /名称必填/,
  )
  await assert.rejects(
    () =>
      createIteration(prisma, {
        name: '坏迭代',
        startDate: new Date('2026-08-14'),
        endDate: new Date('2026-08-01'),
      }),
    /开始日期不能晚于结束日期/,
  )
})

test('迭代列表：返回需求数量', async () => {
  const { listIterations } = await iter()
  const list = await listIterations(prisma)
  assert.ok(list.length >= 1)
  assert.ok(list[0]._count.requirements >= 0)
})

test('加入迭代：未通过评审的需求被阻断并说明缺项', async () => {
  const { createIteration, addRequirementToIteration } = await iter()
  const { createRequirement } = await reqs()
  // 先创建一条占位需求（REQ-001），保证后续编号与其他测试假设一致
  await createRequirement(prisma, {
    title: '占位需求',
    type: '产品需求',
    source: '产品',
    owner: 'alice',
    priority: 'P1',
  })
  await createRequirement(prisma, {
    title: '未评审需求',
    type: '产品需求',
    source: '产品',
    owner: 'carol',
    priority: 'P2',
  })
  const it = await createIteration(prisma, {
    name: '迭代 A',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-14'),
  })
  await assert.rejects(
    () => addRequirementToIteration(prisma, it.id, 'REQ-002'),
    /尚未通过全部评审/,
  )
  await assert.rejects(
    () => addRequirementToIteration(prisma, it.id, 'REQ-002'),
    /业务评审未通过/,
  )
  await assert.rejects(
    () => addRequirementToIteration(prisma, it.id, 'REQ-002'),
    /技术评审未通过/,
  )
})

test('加入迭代：评审通过的需求可加入，重复加入幂等', async () => {
  const { createIteration, addRequirementToIteration, getIteration } = await iter()
  await createReviewedRequirement('REQ-003', '已评审需求')
  const it = await createIteration(prisma, {
    name: '迭代 B',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-14'),
  })
  await addRequirementToIteration(prisma, it.id, 'REQ-003')
  const board = await getIteration(prisma, it.id)
  assert.equal(board.requirements.length, 1)
  assert.equal(board.requirements[0].code, 'REQ-003')

  // 重复加入幂等，不产生副作用
  await addRequirementToIteration(prisma, it.id, 'REQ-003')
  const again = await getIteration(prisma, it.id)
  assert.equal(again.requirements.length, 1)
})

test('加入迭代：需求不存在报错', async () => {
  const { createIteration, addRequirementToIteration } = await iter()
  const it = await createIteration(prisma, {
    name: '迭代 C',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-14'),
  })
  await assert.rejects(() => addRequirementToIteration(prisma, it.id, 'REQ-999'), /需求不存在/)
})

test('迭代看板：计划/完成/阻塞/结转归类正确', async () => {
  const { createIteration, addRequirementToIteration, iterationBoard } = await iter()
  // REQ-003 已在迭代 B 中（状态草稿 -> 计划工作）
  const it = await createIteration(prisma, {
    name: '迭代 D',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-14'),
  })
  // 已完成需求
  await createReviewedRequirement('REQ-004', '已完成需求')
  await addRequirementToIteration(prisma, it.id, 'REQ-004')
  await prisma.requirement.update({ where: { code: 'REQ-004' }, data: { status: '已关闭' } })
  // 阻塞需求
  await createReviewedRequirement('REQ-005', '阻塞需求')
  await addRequirementToIteration(prisma, it.id, 'REQ-005')
  await prisma.requirement.update({ where: { code: 'REQ-005' }, data: { status: '阻塞' } })
  // 进行中需求
  await createReviewedRequirement('REQ-006', '进行中需求')
  await addRequirementToIteration(prisma, it.id, 'REQ-006')
  await prisma.requirement.update({ where: { code: 'REQ-006' }, data: { status: '开发中' } })
  // 结转需求：上一迭代创建（先入迭代 B，再入本迭代，仍处于进行中）
  await createReviewedRequirement('REQ-007', '结转需求')
  const itB = await (await iter()).listIterations(prisma).then((l) => l.find((x) => x.name === '迭代 B'))
  await addRequirementToIteration(prisma, itB!.id, 'REQ-007')
  await addRequirementToIteration(prisma, it.id, 'REQ-007')
  await prisma.requirement.update({ where: { code: 'REQ-007' }, data: { status: '开发中' } })

  const board = await iterationBoard(prisma, it.id)
  assert.equal(board.total, 4)
  assert.deepEqual(
    board.buckets.completed.map((r) => r.code),
    ['REQ-004'],
  )
  assert.deepEqual(
    board.buckets.blocked.map((r) => r.code),
    ['REQ-005'],
  )
  assert.deepEqual(
    board.buckets.carried.map((r) => r.code),
    ['REQ-007'],
  )
  assert.deepEqual(
    board.buckets.planned.map((r) => r.code),
    ['REQ-006'],
  )
})

test('需求拆分任务：编号 TASK-001 起、类型校验、初始待处理', async () => {
  const { createTask } = await tasks()
  const a = await createTask(prisma, 'REQ-003', {
    title: '登录接口开发',
    type: '开发',
    assignee: 'alice',
    estimate: 2,
  })
  assert.equal(a.code, 'TASK-001')
  assert.equal(a.status, '待处理')
  assert.equal(a.assignee, 'alice')

  const b = await createTask(prisma, 'REQ-003', { title: '登录测试', type: '测试' })
  assert.equal(b.code, 'TASK-002')

  await assert.rejects(
    () => createTask(prisma, 'REQ-003', { title: '非法类型', type: '运维' }),
    /任务类型不合法/,
  )
  await assert.rejects(
    () => createTask(prisma, 'REQ-999', { title: '无需求', type: '开发' }),
    /需求不存在/,
  )
})

test('任务状态流转：合法流转留痕，非法流转拒绝且无留痕', async () => {
  const { transitionTask, getTask } = await tasks()
  await transitionTask(prisma, 'TASK-001', '进行中', { actor: 'alice', reason: '开始开发' })
  const task = await getTask(prisma, 'TASK-001')
  assert.equal(task!.status, '进行中')
  assert.equal(task!.transitions.length, 1)
  assert.equal(task!.transitions[0].actor, 'alice')
  assert.equal(task!.transitions[0].from, '待处理')
  assert.equal(task!.transitions[0].to, '进行中')

  // 非法流转：进行中 -> 已完成（必须逐级流转）
  await assert.rejects(
    () => transitionTask(prisma, 'TASK-001', '已完成', { actor: 'alice', reason: '跳级' }),
    /非法流转/,
  )
  const after = await getTask(prisma, 'TASK-001')
  assert.equal(after!.transitions.length, 1) // 无新增留痕

  // 完整链路：进行中 -> 待代码评审 -> 待构建 -> 待测试 -> 已完成
  await transitionTask(prisma, 'TASK-001', '待代码评审', { actor: 'alice', reason: '提交代码' })
  await transitionTask(prisma, 'TASK-001', '待构建', { actor: 'alice', reason: '评审通过' })
  await transitionTask(prisma, 'TASK-001', '待测试', { actor: 'alice', reason: '构建通过' })
  await transitionTask(prisma, 'TASK-001', '已完成', { actor: 'alice', reason: '测试通过' })
  const done = await getTask(prisma, 'TASK-001')
  assert.equal(done!.status, '已完成')
  assert.equal(done!.transitions.length, 5)
})

test('任务流转：异常状态须携带原因且可配置解除', async () => {
  const { transitionTask } = await tasks()
  // TASK-002 初始待处理 -> 进行中 -> 阻塞（异常状态）
  await transitionTask(prisma, 'TASK-002', '进行中', { actor: 'bob', reason: '开始' })
  await transitionTask(prisma, 'TASK-002', '阻塞', { actor: 'bob', reason: '依赖未就绪' })
  const blocked = await (await tasks()).getTask(prisma, 'TASK-002')
  assert.equal(blocked!.status, '阻塞')

  // 阻塞解除回到进行中
  await transitionTask(prisma, 'TASK-002', '进行中', { actor: 'bob', reason: '依赖就绪' })
  const resumed = await (await tasks()).getTask(prisma, 'TASK-002')
  assert.equal(resumed!.status, '进行中')
})
