import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

export async function GET() {
  try {
    const projectCount = await prisma.project.count();
    return NextResponse.json({
      status: 'ok',
      service: 'cmx-harness',
      version: '0.1.0',
      db: { connected: true, projects: projectCount },
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        db: { connected: false },
        detail: err instanceof Error ? err.message : 'unknown error',
      },
      { status: 500 }
    );
  }
}
