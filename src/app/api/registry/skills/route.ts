import { NextResponse } from 'next/server';
import { skillRegistry } from '../../../../../hoare.ai/registries/skill-registry.js';

interface SkillEntry {
  id: string; name: string; kind: string; version: string;
  pluginId?: string; description?: string; registeredAt: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') ?? undefined;
  const skills = (skillRegistry.list(kind) as SkillEntry[]).map(({ id, name, kind: k, version, pluginId, description, registeredAt }) => ({
    id, name, kind: k, version, pluginId, description, registeredAt,
  }));
  return NextResponse.json({ skills, total: skills.length });
}
