import { NextResponse } from 'next/server';
import { metrics } from '../../../../../hoare.ai/observability/metrics.js';

export async function GET() {
  return NextResponse.json({ metrics: metrics.dump(), stats: metrics.stats() });
}
