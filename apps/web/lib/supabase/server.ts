import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof cookies>["set"]>[2];
};

export function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        try { cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options); }); }
        catch { /* Server Components cannot set cookies */ }
      },
    },
  });
}
