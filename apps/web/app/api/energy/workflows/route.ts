import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function requireUser() {
  if (!hasSupabaseConfig()) return null;
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (hasSupabaseConfig() && !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = await request.json().catch(() => ({}));
  const body = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.HOARE_API_KEY) headers["x-api-key"] = process.env.HOARE_API_KEY;
  if (user?.id) headers["x-org-id"] = user.id;

  const res = await fetch(`${API_URL}/api/energy/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, orgId: body.orgId ?? user?.id }),
  });
  const payload = await res.json().catch(() => ({ error: res.statusText }));
  return NextResponse.json(payload, { status: res.status });
}
