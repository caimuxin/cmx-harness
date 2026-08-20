import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CMX Harness',
  description: 'DevOps 研发交付平台 —— 面向单研发团队的一体化交付闭环',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
