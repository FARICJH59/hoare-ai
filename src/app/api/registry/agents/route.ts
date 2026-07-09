import { NextResponse } from 'next/server';
import { agentRegistry } from '../../../../../hoare.ai/registries/agent-registry.js';

interface AgentEntry {
  id: string; name: string; kind: string; version: string;
  author?: string; description?: string; capabilities?: string[]; registeredAt: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') ?? undefined;
  const agents = (agentRegistry.list(kind) as AgentEntry[]).map(({ id, name, kind: k, version, author, description, capabilities, registeredAt }) => ({
    id, name, kind: k, version, author, description, capabilities, registeredAt,
  }));
  return NextResponse.json({ agents, total: agents.length });
}
