import { NextResponse } from 'next/server';
import { organizations } from '../../../../../hoare.ai/enterprise/organizations.js';

export async function GET() {
  return NextResponse.json({ organizations: organizations.list(), stats: organizations.stats() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; plan?: string; metadata?: Record<string, unknown> };
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const org = organizations.create({ name: body.name, plan: body.plan, metadata: body.metadata });
    return NextResponse.json(org, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
