import { NextResponse } from 'next/server';
import { capabilityMarketplace } from '../../../../../hoare.ai/marketplace/capability-marketplace.js';

export async function GET() {
  const packs = capabilityMarketplace.listPacks();
  return NextResponse.json({ packs, total: packs.length });
}
