import { NextResponse } from 'next/server';
import { QGPSClient }   from '@/gateway/qgps-client';
import { sessionMemory } from '@/memory';
import { projectMemory } from '@/memory';

const qgpsClient = new QGPSClient();

export async function GET() {
  const qgpsHealth = await qgpsClient.health().catch(() => ({ healthy: false, latencyMs: -1 }));
  const memStats   = sessionMemory.stats();
  const projStats  = projectMemory.stats();

  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      app:  { healthy: true },
      qgps: qgpsHealth,
    },
    memory: {
      sessions: memStats.sessions,
      messages: memStats.messages,
      projects: projStats.projects,
    },
  });
}
