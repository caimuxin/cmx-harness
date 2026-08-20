import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>CMX Harness</h1>
      <p>DevOps 研发交付平台 —— 面向单研发团队的一体化交付闭环。</p>
      <p style={{ color: '#555' }}>
        平台管理交付闭环（需求 → 任务 → 测试 → 发布 → 验收 → 度量），GitHub 执行代码协作与自动化流水线。
      </p>
      <ul>
        <li><Link href="/api/health">API 健康检查</Link></li>
      </ul>
      <hr />
      <p style={{ color: '#999', fontSize: 13 }}>
        HARN-001 工程骨架 · PRD v2 · 阶段 1
      </p>
    </main>
  );
}
