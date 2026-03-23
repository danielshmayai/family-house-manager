import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const start = Date.now();

  let dbStatus = 'ok';
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = 'error';
    dbError = e instanceof Error ? e.message : String(e);
    console.error('[health] DB check failed:', dbError);
  }

  const uptime = process.uptime();
  const mem = process.memoryUsage();

  const body = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    ...(dbError ? { dbError } : {}),
    uptimeSeconds: Math.floor(uptime),
    memoryMB: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    responseMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  };

  console.log('[health]', JSON.stringify(body));

  return NextResponse.json(body, {
    status: dbStatus === 'ok' ? 200 : 503,
  });
}
