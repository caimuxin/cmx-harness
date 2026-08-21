'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface GateCheck {
  id: string
  description: string
  satisfied: boolean
  fixAction: string
}

interface GateResult {
  ruleId: string
  passed: boolean
  checks: GateCheck[]
}

interface Review {
  id: string
  kind: 'business' | 'tech'
  conclusion: string
  reviewer: string
  at: string
  comment?: string
}

interface Transition {
  id: string
  actor: string
  from: string
  to: string
  reason: string
  at: string
}

interface RequirementDetail {
  code: string
  title: string
  type: string
  source: string
  owner: string
  priority: string
  businessValue: string | null
  acceptanceCriteria: string | null
  status: string
  iterationId: string | null
  bizReviewApproved: boolean
  techReviewApproved: boolean
  reviews: Review[]
  transitions: Transition[]
}

export default function RequirementDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState<string | null>(null)
  const [req, setReq] = useState<RequirementDetail | null>(null)
  const [gates, setGates] = useState<{ enterDev: GateResult; close: GateResult } | null>(null)
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ code }) => setCode(code))
  }, [params])

  async function load() {
    if (!code) return
    const res = await fetch(`/api/requirements/${code}`)
    const json = await res.json()
    setReq(json.data)
    setGates(json.gates)
  }

  useEffect(() => {
    load()
  }, [code])

  async function onTransition(e: React.FormEvent) {
    e.preventDefault()
    if (!code) return
    setError('')
    const res = await fetch(`/api/requirements/${code}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, reason, actor: '当前用户' }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? '流转失败')
      return
    }
    setTo('')
    setReason('')
    load()
  }

  if (!req) return <main className="p-6">加载中…</main>

  const failedEnterDev = gates?.enterDev.checks.filter((c) => !c.satisfied) ?? []

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <p className="mb-2">
        <Link className="text-blue-600 hover:underline" href="/requirements">
          ← 需求中心
        </Link>
      </p>
      <h1 className="text-2xl font-bold mb-1">
        {req.code} · {req.title}
      </h1>
      <p className="text-gray-600 mb-4">
        {req.type} / {req.priority} / 负责人 {req.owner} / 状态{' '}
        <span className="font-semibold">{req.status}</span>
      </p>

      <section className="border rounded p-4 mb-4">
        <h2 className="font-semibold mb-2">需求信息</h2>
        <p>
          <strong>业务价值：</strong>
          {req.businessValue || <span className="text-red-600">未填写</span>}
        </p>
        <p>
          <strong>验收标准：</strong>
          {req.acceptanceCriteria || <span className="text-red-600">未填写</span>}
        </p>
        <p>
          <strong>来源：</strong>
          {req.source}
          <span className="ml-4">
            <strong>迭代：</strong>
            {req.iterationId || '未排期'}
          </span>
        </p>
        <p>
          <strong>评审状态：</strong>
          业务评审 {req.bizReviewApproved ? '✅ 通过' : '未通过'} / 技术评审{' '}
          {req.techReviewApproved ? '✅ 通过' : '未通过'}
        </p>
      </section>

      <section className="border rounded p-4 mb-4">
        <h2 className="font-semibold mb-2">状态流转</h2>
        <form onSubmit={onTransition} className="flex gap-2">
          <select className="border rounded p-2 flex-1" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">选择目标状态…</option>
            {['待澄清', '待业务评审', '待技术评审', '待排期', '已排期', '开发中', '测试中', '待发布', '已发布', '待验收', '已关闭', '需补充', '阻塞', '挂起', '取消', '驳回'].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          <input
            className="border rounded p-2 flex-[2]"
            placeholder="流转原因 *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button className="bg-blue-600 text-white rounded px-4 py-2" type="submit">
            流转
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </section>

      {gates && (
        <section className="border rounded p-4 mb-4">
          <h2 className="font-semibold mb-2">
            进入开发门禁（10.1）{' '}
            {gates.enterDev.passed ? <span className="text-green-600">✅ 通过</span> : <span className="text-red-600">❌ 未通过</span>}
          </h2>
          <ul className="space-y-1 text-sm">
            {gates.enterDev.checks.map((c) => (
              <li key={c.id} className={c.satisfied ? 'text-green-700' : 'text-red-700'}>
                {c.id} {c.description}
                {!c.satisfied && <span className="text-gray-600"> — 修复：{c.fixAction}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border rounded p-4 mb-4">
        <h2 className="font-semibold mb-2">流转留痕（I-5）</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-1">时间</th>
              <th className="p-1">操作者</th>
              <th className="p-1">从</th>
              <th className="p-1">到</th>
              <th className="p-1">原因</th>
            </tr>
          </thead>
          <tbody>
            {req.transitions.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-1">{new Date(t.at).toLocaleString()}</td>
                <td className="p-1">{t.actor}</td>
                <td className="p-1">{t.from}</td>
                <td className="p-1">{t.to}</td>
                <td className="p-1">{t.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
