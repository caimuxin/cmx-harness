/**
 * HARN-004 评审中心测试（PRD 8.3 + 9.1 + 10.1）
 * 覆盖：
 * - 业务/技术评审检查项完整性
 * - 评审结论 -> 需求目标状态映射
 * - 评审结论接入需求门禁（10.1-3 / 10.1-4）
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  createReview,
  businessChecklistComplete,
  techChecklistComplete,
  conclusionToTargetStatus,
  latestReview,
  BUSINESS_CHECKLIST_KEYS,
  TECH_CHECKLIST_KEYS,
} from '../../../src/modules/reviews/review.service'
import { ReviewConclusion } from '../../../src/domain/models'
import { reviewApproved, evaluateRequirementEnterDev } from '../../../src/domain/gate-rules'

// ---- 检查项完整性（PRD 8.3） ----

test('业务评审检查项 5 项', () => {
  assert.deepEqual(BUSINESS_CHECKLIST_KEYS, [
    'businessValue',
    'scenario',
    'scope',
    'notDo',
    'acceptanceTestable',
  ])
})

test('技术评审检查项 6 项', () => {
  assert.deepEqual(TECH_CHECKLIST_KEYS, [
    'feasibility',
    'archImpact',
    'dependency',
    'techRisk',
    'roughEstimate',
    'testReleaseImpact',
  ])
})

test('业务评审全部勾选才 complete', () => {
  const all = Object.fromEntries(BUSINESS_CHECKLIST_KEYS.map((k) => [k, true]))
  assert.equal(businessChecklistComplete(all), true)
  assert.equal(businessChecklistComplete({ ...all, businessValue: false }), false)
  assert.equal(businessChecklistComplete({}), false)
})

test('技术评审全部勾选才 complete', () => {
  const all = Object.fromEntries(TECH_CHECKLIST_KEYS.map((k) => [k, true]))
  assert.equal(techChecklistComplete(all), true)
  assert.equal(techChecklistComplete({ ...all, techRisk: false }), false)
})

// ---- 评审结论 -> 需求状态（PRD 9.1） ----

test('业务评审通过 -> 待技术评审', () => {
  assert.equal(conclusionToTargetStatus('business', ReviewConclusion.APPROVED), '待技术评审')
})

test('技术评审通过 -> 待排期', () => {
  assert.equal(conclusionToTargetStatus('tech', ReviewConclusion.APPROVED), '待排期')
})

test('需补充 -> 需补充状态', () => {
  assert.equal(conclusionToTargetStatus('business', ReviewConclusion.NEED_SUPPLEMENT), '需补充')
})

test('驳回 -> 驳回状态', () => {
  assert.equal(conclusionToTargetStatus('tech', ReviewConclusion.REJECTED), '驳回')
})

test('延期 -> 挂起状态', () => {
  assert.equal(conclusionToTargetStatus('business', ReviewConclusion.DEFERRED), '挂起')
})

// ---- 评审记录 ----

test('创建业务评审记录', () => {
  const r = createReview({
    requirementId: 'REQ-001',
    kind: 'business',
    conclusion: ReviewConclusion.APPROVED,
    reviewer: 'alice',
    checklist: { businessValue: true, scenario: true, scope: true, notDo: true, acceptanceTestable: true },
    comment: '场景清晰',
  })
  assert.equal(r.kind, 'business')
  assert.equal(r.conclusion, '通过')
  assert.equal(r.reviewer, 'alice')
  assert.ok(r.at instanceof Date)
})

test('latestReview 取最新一条同类型评审', () => {
  const r1 = createReview({ requirementId: 'REQ-001', kind: 'business', conclusion: '需补充', reviewer: 'a', checklist: {} })
  const r2 = createReview({ requirementId: 'REQ-001', kind: 'business', conclusion: '通过', reviewer: 'a', checklist: {} })
  const r3 = createReview({ requirementId: 'REQ-001', kind: 'tech', conclusion: '通过', reviewer: 'b', checklist: {} })
  assert.equal(latestReview([r1, r2, r3], 'business')?.conclusion, '通过')
  assert.equal(latestReview([r1, r2, r3], 'tech')?.conclusion, '通过')
  assert.equal(latestReview([], 'business'), undefined)
})

// ---- 评审结论接入需求门禁（10.1-3 / 10.1-4） ----

test('业务评审未通过时需求不能进入开发（10.1-3）', () => {
  const reviews = [
    createReview({ requirementId: 'REQ-001', kind: 'business', conclusion: '需补充', reviewer: 'a', checklist: {} }),
  ]
  const g = evaluateRequirementEnterDev({
    businessValue: 'v',
    acceptanceCriteria: 'a',
    bizReviewApproved: reviewApproved(reviews, 'business'),
    techReviewApproved: true,
    planned: true,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((c) => c.id === '10.1-3')!.satisfied, false)
})

test('业务评审通过 + 技术评审通过后需求可进入开发（10.1 全绿）', () => {
  const reviews = [
    createReview({ requirementId: 'REQ-001', kind: 'business', conclusion: '通过', reviewer: 'a', checklist: {} }),
    createReview({ requirementId: 'REQ-001', kind: 'tech', conclusion: '通过', reviewer: 'b', checklist: {} }),
  ]
  const g = evaluateRequirementEnterDev({
    businessValue: 'v',
    acceptanceCriteria: 'a',
    bizReviewApproved: reviewApproved(reviews, 'business'),
    techReviewApproved: reviewApproved(reviews, 'tech'),
    planned: true,
  })
  assert.equal(g.passed, true)
})

test('技术评审驳回后需求不能进入开发（10.1-4）', () => {
  const reviews = [
    createReview({ requirementId: 'REQ-001', kind: 'business', conclusion: '通过', reviewer: 'a', checklist: {} }),
    createReview({ requirementId: 'REQ-001', kind: 'tech', conclusion: '驳回', reviewer: 'b', checklist: {} }),
  ]
  const g = evaluateRequirementEnterDev({
    businessValue: 'v',
    acceptanceCriteria: 'a',
    bizReviewApproved: reviewApproved(reviews, 'business'),
    techReviewApproved: reviewApproved(reviews, 'tech'),
    planned: true,
  })
  assert.equal(g.passed, false)
  assert.equal(g.checks.find((c) => c.id === '10.1-4')!.satisfied, false)
})
