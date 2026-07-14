"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  return { email, password, redirectTo };
}
function safeRedirectPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}
export async function signInAction(formData: FormData) {
  if (!hasSupabaseConfig()) { redirect("/sign-in?error=missing-config"); }
  const { email, password, redirectTo } = getCredentials(formData);
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { redirect("/sign-in?error=invalid-credentials"); }
  revalidatePath("/", "layout");
  redirect(safeRedirectPath(redirectTo));
}
export async function signUpAction(formData: FormData) {
  if (!hasSupabaseConfig()) { redirect("/sign-in?error=missing-config"); }
  const { email, password, redirectTo } = getCredentials(formData);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { redirect("/sign-in?error=sign-up-failed"); }
  revalidatePath("/", "layout");
  if (!data.session) { redirect("/sign-in?message=check-email"); }
  redirect(safeRedirectPath(redirectTo));
}
export async function signOutAction() {
  if (hasSupabaseConfig()) { const supabase = createSupabaseServerClient(); await supabase.auth.signOut(); }
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
