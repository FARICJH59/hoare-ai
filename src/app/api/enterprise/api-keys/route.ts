import { NextResponse } from 'next/server';
import { apiKeys } from '../../../../../hoare.ai/enterprise/api-keys.js';

interface KeyRecord {
  hash: string; name: string; scopes: string[]; expiresAt: string | null;
  createdAt: string; lastUsedAt: string | null; revoked: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId query parameter is required' }, { status: 400 });
  }
  const keys = (apiKeys.listByTenant(tenantId) as KeyRecord[]).map(({ hash, name, scopes, expiresAt, createdAt, lastUsedAt, revoked }) => ({
    hash: hash.slice(0, 8) + '...', name, scopes, expiresAt, createdAt, lastUsedAt, revoked,
  }));
  return NextResponse.json({ keys, total: keys.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; tenantId?: string; name?: string; scopes?: string[]; expiresAt?: string; hash?: string };
    const { action } = body;

    if (action === 'issue') {
      if (!body.tenantId || !body.name) {
        return NextResponse.json({ error: 'tenantId and name are required' }, { status: 400 });
      }
      const { raw, record } = apiKeys.issue({ tenantId: body.tenantId, name: body.name, scopes: body.scopes, expiresAt: body.expiresAt }) as { raw: string; record: KeyRecord };
      return NextResponse.json({
        raw, // Only shown once!
        record: { hash: record.hash.slice(0, 8) + '...', name: record.name, scopes: record.scopes, createdAt: record.createdAt },
      }, { status: 201 });
    }

    if (action === 'revoke') {
      if (!body.hash) return NextResponse.json({ error: 'hash is required' }, { status: 400 });
      const ok = apiKeys.revoke(body.hash);
      return NextResponse.json({ ok });
    }

    return NextResponse.json({ error: 'Unknown action. Use: issue | revoke' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
