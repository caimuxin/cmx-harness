/**
 * HARN-002 状态机测试（PRD 9 + I-5 + I-8）
 * 覆盖：
 * - 状态机配置与 PRD 9.1/9.2/9.3 主流转一致
 * - 非法流转被拒绝（验收门禁 1）
 * - 每次流转记录操作者、时间戳、原因（验收门禁 2，I-5）
 * - 异常状态只能经配置流转或豁免进入（PRD 9 通则 3）
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  canTransition,
  transition,
  allowedTransitions,
} from '../../src/domain/state-machine'
import {
  requirementStateMachine,
  taskStateMachine,
  releaseStateMachine,
} from '../../src/domain/state-machine-config'

// ---- 主流程合法性（PRD 9.1 / 9.2 / 9.3） ----

test('需求状态机主流程合法流转', () => {
  const flow = [
    ['草稿', '待澄清'],
    ['待澄清', '待业务评审'],
    ['待业务评审', '待技术评审'],
    ['待技术评审', '待排期'],
    ['待排期', '已排期'],
    ['已排期', '开发中'],
    ['开发中', '测试中'],
    ['测试中', '待发布'],
    ['待发布', '已发布'],
    ['已发布', '待验收'],
    ['待验收', '已关闭'],
  ]
  for (const [from, to] of flow) {
    assert.ok(canTransition(requirementStateMachine, from, to), `${from} -> ${to} 应合法`)
  }
})

test('任务状态机主流程合法流转', () => {
  const flow = [
    ['待处理', '进行中'],
    ['进行中', '待代码评审'],
    ['待代码评审', '待构建'],
    ['待构建', '待测试'],
    ['待测试', '已完成'],
  ]
  for (const [from, to] of flow) {
    assert.ok(canTransition(taskStateMachine, from, to), `${from} -> ${to} 应合法`)
  }
})

test('发布单状态机主流程合法流转', () => {
  const flow = [
    ['草稿', '待审批'],
    ['待审批', '待部署'],
    ['待部署', '部署中'],
    ['部署中', '待验证'],
    ['待验证', '已发布'],
    ['已发布', '已关闭'],
  ]
  for (const [from, to] of flow) {
    assert.ok(canTransition(releaseStateMachine, from, to), `${from} -> ${to} 应合法`)
  }
})

// ---- 非法流转拒绝（验收门禁 1） ----

test('非法流转被拒绝：需求 草稿 -> 已关闭 不在配置流转表', () => {
  assert.equal(canTransition(requirementStateMachine, '草稿', '已关闭'), false)
  const r = transition({ config: requirementStateMachine }, { from: '草稿', to: '已关闭', actor: 'u', reason: 'x' })
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /非法流转/)
})

test('非法流转被拒绝：任务 待处理 -> 已完成 跳过中间态', () => {
  assert.equal(canTransition(taskStateMachine, '待处理', '已完成'), false)
})

test('非法流转被拒绝：发布单 草稿 -> 已发布 跳过审批部署', () => {
  assert.equal(canTransition(releaseStateMachine, '草稿', '已发布'), false)
})

test('同状态流转被拒绝', () => {
  const r = transition({ config: requirementStateMachine }, { from: '草稿', to: '草稿', actor: 'u', reason: 'x' })
  assert.equal(r.ok, false)
})

// ---- 流转留痕（验收门禁 2，I-5） ----

test('成功流转生成留痕：操作者、时间戳、原因', () => {
  const before = Date.now()
  const r = transition(
    { config: requirementStateMachine },
    { from: '草稿', to: '待澄清', actor: 'alice', reason: '用户需求初步澄清' },
  )
  assert.equal(r.ok, true)
  const rec = r.record!
  assert.equal(rec.from, '草稿')
  assert.equal(rec.to, '待澄清')
  assert.equal(rec.actor, 'alice')
  assert.equal(rec.reason, '用户需求初步澄清')
  assert.ok(rec.at.getTime() >= before && rec.at.getTime() <= Date.now())
  assert.ok(rec.id.length > 0)
})

test('流转原因必填：缺失时拒绝并提示（I-5）', () => {
  const r = transition({ config: requirementStateMachine }, { from: '草稿', to: '待澄清', actor: 'alice', reason: '' })
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /原因/)
})

// ---- 异常状态（PRD 9 通则 3） ----

test('异常状态必须通过配置流转进入', () => {
  // 开发中 -> 阻塞 是配置流转
  assert.ok(canTransition(requirementStateMachine, '开发中', '阻塞'))
  // 任意状态 -> 阻塞 未被配置时必须拒绝（以 草稿 为例）
  assert.equal(canTransition(requirementStateMachine, '草稿', '阻塞'), false)
})

test('异常状态退出必须配置：需补充 -> 待澄清 可恢复', () => {
  assert.ok(canTransition(requirementStateMachine, '需补充', '待澄清'))
})

test('终态无出口流转', () => {
  assert.deepEqual(allowedTransitions(requirementStateMachine, '已关闭'), [])
  assert.deepEqual(allowedTransitions(taskStateMachine, '已完成'), [])
  assert.deepEqual(allowedTransitions(releaseStateMachine, '已关闭'), [])
})

// ---- 配置完整性（I-8） ----

test('状态机配置无未知目标状态（防拼写漂移）', () => {
  for (const [name, config] of Object.entries({
    需求: requirementStateMachine,
    任务: taskStateMachine,
    发布: releaseStateMachine,
  })) {
    const valid = new Set(Object.keys(config))
    for (const [from, tos] of Object.entries(config)) {
      for (const t of tos) {
        assert.ok(valid.has(t.to), `${name}状态机 ${from} -> ${t.to} 目标状态未定义`)
      }
    }
  }
})
