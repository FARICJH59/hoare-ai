import { NextResponse } from 'next/server';
import { rbac } from '../../../../../hoare.ai/enterprise/rbac.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const userId   = searchParams.get('userId');

  if (tenantId && userId) {
    const roles       = rbac.getRoles(tenantId, userId);
    const permissions = rbac.getPermissions(tenantId, userId);
    return NextResponse.json({ tenantId, userId, roles, permissions });
  }

  return NextResponse.json({ roles: rbac.listRoles(), stats: rbac.stats() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; tenantId?: string; userId?: string; roleId?: string; name?: string; permissions?: string[]; inherits?: string };
    const { action, tenantId, userId, roleId } = body;

    if (action === 'assign') {
      if (!tenantId || !userId || !roleId) {
        return NextResponse.json({ error: 'tenantId, userId, and roleId are required' }, { status: 400 });
      }
      rbac.assign(tenantId, userId, roleId);
      return NextResponse.json({ ok: true, action: 'assigned', tenantId, userId, roleId });
    }

    if (action === 'revoke') {
      if (!tenantId || !userId || !roleId) {
        return NextResponse.json({ error: 'tenantId, userId, and roleId are required' }, { status: 400 });
      }
      rbac.revoke(tenantId, userId, roleId);
      return NextResponse.json({ ok: true, action: 'revoked', tenantId, userId, roleId });
    }

    if (action === 'define') {
      if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      const role = rbac.defineRole({ name: body.name, permissions: body.permissions || [], inherits: body.inherits });
      return NextResponse.json(role, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown action. Use: assign | revoke | define' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
