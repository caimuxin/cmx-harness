import { NextResponse } from 'next/server';

/**
 * 健康检查（仅限 API 内部调用，非生产探活用）
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
