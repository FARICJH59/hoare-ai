import { NextResponse } from 'next/server';
import { capabilityMarketplace } from '../../../../../hoare.ai/marketplace/capability-marketplace.js';

export async function POST(request: Request) {
  try {
    const { tenantId, packId } = await request.json() as { tenantId?: string; packId?: string };
    if (!tenantId || !packId) {
      return NextResponse.json({ error: 'tenantId and packId are required' }, { status: 400 });
    }
    capabilityMarketplace.disable(tenantId, packId);
    return NextResponse.json({ ok: true, tenantId, packId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
