/**
 * HARN-002 门禁规则测试（PRD 10）
 * 覆盖四条门禁：10.1 / 10.2 / 10.3 / 10.4
 * 验收门禁：门禁失败时能返回明确失败原因与修复动作。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateRequirementEnterDev,
  evaluatePrMerge,
  evaluateRelease,
  evaluateRequirementClose,
  reviewApproved,
  openBlockingDefects,
} from '../../src/domain/gate-rules'
import type { Review, Defect } from '../../src/domain/models'

// ---- 10.1 需求进入开发门禁 ----

test('10.1 全部满足时通过', () => {
  const g = evaluateRequirementEnterDev({
    businessValue: '提升登录成功率',
    acceptanceCriteria: '登录成功率 > 99%',
    bizReviewApproved: true,
    techReviewApproved: true,
    planned: true,
  })
  assert.equal(g.passed, true)
  assert.equal(g.ruleId, 'REQ_ENTER_DEV')
})

test('10.1 缺少业务价值时失败，并给出修复动作', () => {
  const g = evaluateRequirementEnterDev({
    businessValue: '',
    acceptanceCriteria: 'x',
    bizReviewApproved: true,
    techReviewApproved: true,
    planned: true,
  })
  assert.equal(g.passed, false)
  const c = g.checks.find((x) => x.id === '10.1-1')!
  assert.equal(c.satisfied, false)
  assert.equal(c.fixAction, '补充业务价值')
})

test('10.1 缺少验收标准时失败', () => {
  const g = evaluateRequirementEnterDev({
    businessValue: 'v',
    acceptanceCriteria: undefined,
    bizReviewApproved: true,
    techReviewApproved: true,
    planned: true,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.1-2')!.satisfied, false)
})

test('10.1 业务评审未通过时失败', () => {
  const g = evaluateRequirementEnterDev({
    businessValue: 'v',
    acceptanceCriteria: 'a',
    bizReviewApproved: false,
    techReviewApproved: true,
    planned: true,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.1-3')!.satisfied, false)
})

test('10.1 未进入迭代计划时失败', () => {
  const g = evaluateRequirementEnterDev({
    businessValue: 'v',
    acceptanceCriteria: 'a',
    bizReviewApproved: true,
    techReviewApproved: true,
    planned: false,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.1-5')!.satisfied, false)
})

test('10.1 失败时返回全部未通过项与修复动作', () => {
  const g = evaluateRequirementEnterDev({})
  assert.equal(g.passed, false)
  const failed = g.checks.filter((c) => !c.satisfied)
  assert.equal(failed.length, 5)
  for (const c of failed) {
    assert.ok(c.fixAction.length > 0, `${c.id} 应有修复动作`)
  }
})

// ---- 10.2 PR 合并门禁 ----

test('10.2 全部满足时通过', () => {
  const g = evaluatePrMerge({
    linkedToRequirementAndTask: true,
    reviewerApproved: true,
    requiredChecksPassed: true,
    automatedTestsPassed: true,
    openBlockingDefects: 0,
  })
  assert.equal(g.passed, true)
  assert.equal(g.ruleId, 'PR_MERGE')
})

test('10.2 无评审人通过时失败', () => {
  const g = evaluatePrMerge({
    linkedToRequirementAndTask: true,
    reviewerApproved: false,
    requiredChecksPassed: true,
    automatedTestsPassed: true,
    openBlockingDefects: 0,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.2-2')!.fixAction, '获得至少 1 名评审人通过')
})

test('10.2 存在未关闭阻塞缺陷时失败', () => {
  const g = evaluatePrMerge({
    linkedToRequirementAndTask: true,
    reviewerApproved: true,
    requiredChecksPassed: true,
    automatedTestsPassed: true,
    openBlockingDefects: 1,
  })
  assert.equal(g.passed, false)
})

// ---- 10.3 发布门禁 ----

test('10.3 全部满足时通过', () => {
  const g = evaluateRelease({
    approved: true,
    requirementsTestedPassed: true,
    openBlockingDefects: 0,
    artifact: 'v1.2.0',
    environment: 'production',
    rollbackPlan: '回滚到 v1.1.0',
  })
  assert.equal(g.passed, true)
  assert.equal(g.ruleId, 'RELEASE')
})

test('10.3 审批未完成时失败', () => {
  const g = evaluateRelease({
    approved: false,
    requirementsTestedPassed: true,
    openBlockingDefects: 0,
    artifact: 'v1.2.0',
    environment: 'production',
    rollbackPlan: '回滚',
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.3-1')!.satisfied, false)
})

test('10.3 存在阻塞缺陷时失败', () => {
  const g = evaluateRelease({
    approved: true,
    requirementsTestedPassed: true,
    openBlockingDefects: 2,
    artifact: 'v1.2.0',
    environment: 'production',
    rollbackPlan: '回滚',
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.3-3')!.satisfied, false)
})

test('10.3 缺制品、环境、回滚方案时失败', () => {
  const g = evaluateRelease({
    approved: true,
    requirementsTestedPassed: true,
    openBlockingDefects: 0,
    artifact: undefined,
    environment: undefined,
    rollbackPlan: undefined,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.3-4')!.satisfied, false)
  assert.equal(g.checks.find((x) => x.id === '10.3-5')!.satisfied, false)
  assert.equal(g.checks.find((x) => x.id === '10.3-6')!.satisfied, false)
})

// ---- 10.4 需求关闭门禁 ----

test('10.4 全部满足时通过', () => {
  const g = evaluateRequirementClose({
    productionVerified: true,
    businessAccepted: true,
    releaseRecorded: true,
    metricsReady: true,
    metricsInsufficientData: false,
  })
  assert.equal(g.passed, true)
  assert.equal(g.ruleId, 'REQ_CLOSE')
})

test('10.4 生产验证未通过时失败', () => {
  const g = evaluateRequirementClose({
    productionVerified: false,
    businessAccepted: true,
    releaseRecorded: true,
    metricsReady: true,
    metricsInsufficientData: false,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((x) => x.id === '10.4-1')!.fixAction, '完成生产验证')
})

test('10.4 业务验收未通过但有明确例外原因时通过（例外通道）', () => {
  const g = evaluateRequirementClose({
    productionVerified: true,
    businessAccepted: false,
    exceptionReason: '客户季度复盘延期，下季度补充验收',
    releaseRecorded: true,
    metricsReady: true,
    metricsInsufficientData: false,
  })
  assert.equal(g.passed, true)
})

test('10.4 业务验收未通过且无例外原因时失败', () => {
  const g = evaluateRequirementClose({
    productionVerified: true,
    businessAccepted: false,
    exceptionReason: '',
    releaseRecorded: true,
    metricsReady: true,
    metricsInsufficientData: false,
  })
  assert.equal(g.passed, false)
})

test('10.4 度量数据不足但有明确标记时通过（R-7 不误导）', () => {
  const g = evaluateRequirementClose({
    productionVerified: true,
    businessAccepted: true,
    releaseRecorded: true,
    metricsReady: false,
    metricsInsufficientData: true,
  })
  assert.equal(g.passed, true)
})

// ---- 聚合辅助 ----

test('reviewApproved：按最新评审结论判断，无评审记录为 false', () => {
  const reviews: Review[] = [
    { id: 'r1', requirementId: 'REQ-001', kind: 'business', conclusion: '需补充', reviewer: 'a', checklist: {}, at: new Date('2026-08-01') },
    { id: 'r2', requirementId: 'REQ-001', kind: 'business', conclusion: '通过', reviewer: 'a', checklist: {}, at: new Date('2026-08-02') },
  ]
  assert.equal(reviewApproved(reviews, 'business'), true)
  assert.equal(reviewApproved([], 'business'), false)
})

test('openBlockingDefects：仅统计未关闭的阻塞缺陷', () => {
  const defects: Defect[] = [
    { id: 'd1', requirementId: 'REQ-001', title: 'x', blocking: true, status: '新建', transitions: [] },
    { id: 'd2', requirementId: 'REQ-001', title: 'x', blocking: true, status: '已关闭', transitions: [] },
    { id: 'd3', requirementId: 'REQ-001', title: 'x', blocking: false, status: '新建', transitions: [] },
  ]
  assert.equal(openBlockingDefects(defects), 1)
})
