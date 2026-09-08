import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness probe — cheap, no DB.
 * Orchestrators (K8s, Vercel, Fly) hit this to know the process is up.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'teacher-portfolio',
      version: process.env.npm_package_version || '1.0.0',
      uptimeSec: Math.round(process.uptime()),
      ts: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
