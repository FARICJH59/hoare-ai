import { NextResponse } from 'next/server';
import { workflowTracer } from '../../../../../hoare.ai/observability/workflow-tracer.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const traces = workflowTracer.list(Math.min(limit, 200));
  return NextResponse.json({ traces, total: traces.length, stats: workflowTracer.stats() });
}
