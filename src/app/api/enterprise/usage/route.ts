import { NextResponse } from 'next/server';
import { usageMetering } from '../../../../../hoare.ai/enterprise/usage-metering.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId query parameter is required' }, { status: 400 });
  }
  const usage = usageMetering.getUsage(tenantId);
  const quota = usageMetering.getQuota(tenantId);
  return NextResponse.json({ tenantId, usage, quota });
}
