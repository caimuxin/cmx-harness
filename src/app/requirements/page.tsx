'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Requirement {
  code: string
  title: string
  type: string
  priority: string
  status: string
  owner: string
}

export default function RequirementListPage() {
  const [items, setItems] = useState<Requirement[]>([])
  const [form, setForm] = useState({
    title: '',
    type: '业务需求',
    source: '业务',
    owner: '',
    priority: 'P1',
    businessValue: '',
    acceptanceCriteria: '',
  })
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/requirements')
    const json = await res.json()
    setItems(json.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? '创建失败')
      return
    }
    setForm({ ...form, title: '', businessValue: '', acceptanceCriteria: '' })
    load()
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">需求中心</h1>

      <form onSubmit={onSubmit} className="border rounded p-4 mb-6 space-y-2 bg-gray-50">
        <h2 className="font-semibold">新建需求</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="border rounded p-2"
            placeholder="标题 *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className="border rounded p-2"
            placeholder="负责人 *"
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            required
          />
          <select
            className="border rounded p-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {['业务需求', '产品需求', '技术需求', '缺陷', '合规需求', '运维需求'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="border rounded p-2"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {['P0', 'P1', 'P2', 'P3'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <input
          className="border rounded p-2 w-full"
          placeholder="业务价值（为什么做）"
          value={form.businessValue}
          onChange={(e) => setForm({ ...form, businessValue: e.target.value })}
        />
        <input
          className="border rounded p-2 w-full"
          placeholder="验收标准（完成判断条件）"
          value={form.acceptanceCriteria}
          onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="bg-blue-600 text-white rounded px-4 py-2" type="submit">
          创建需求
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">编号</th>
            <th className="p-2">标题</th>
            <th className="p-2">类型</th>
            <th className="p-2">优先级</th>
            <th className="p-2">状态</th>
            <th className="p-2">负责人</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.code} className="border-b">
              <td className="p-2 font-mono">
                <Link className="text-blue-600 hover:underline" href={`/requirements/${r.code}`}>
                  {r.code}
                </Link>
              </td>
              <td className="p-2">{r.title}</td>
              <td className="p-2">{r.type}</td>
              <td className="p-2">{r.priority}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2">{r.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
