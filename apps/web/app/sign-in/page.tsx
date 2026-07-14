import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { signInAction, signUpAction } from "./actions";
function errorMessage(code?: string) {
  switch (code) {
    case "missing-config": return "Supabase is not configured. Add the project URL and anon key in Vercel environment variables.";
    case "invalid-credentials": return "Invalid email or password.";
    case "sign-up-failed": return "Could not create the account. Check whether sign-ups are enabled in Supabase.";
    default: return null;
  }
}
function infoMessage(code?: string) {
  switch (code) {
    case "check-email": return "Account created. Check your email to confirm the address before signing in.";
    default: return null;
  }
}
export default function SignInPage({ searchParams }: { searchParams: { error?: string; message?: string; redirect?: string } }) {
  const redirectTo = searchParams.redirect ?? "/dashboard";
  const message = errorMessage(searchParams.error);
  const info = infoMessage(searchParams.message);
  const isConfigured = hasSupabaseConfig();
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Back home</Link>
        <h1 className="mt-6 text-3xl font-bold">Sign in to HOARE.ai</h1>
        <p className="mt-2 text-sm text-gray-400">Use your Supabase account to access the dashboard and billing.</p>
        {!isConfigured && (<div className="mt-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-200">Supabase environment variables are missing.</div>)}
        {message && (<div className="mt-6 rounded-lg border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">{message}</div>)}
        {info && (<div className="mt-6 rounded-lg border border-blue-700 bg-blue-950/40 p-4 text-sm text-blue-200">{info}</div>)}
        <form className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="block text-sm font-medium text-gray-300">Email<input required name="email" type="email" className="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-blue-500" placeholder="you@example.com" /></label>
          <label className="block text-sm font-medium text-gray-300">Password<input required minLength={6} name="password" type="password" className="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-blue-500" placeholder="••••••••" /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button formAction={signInAction} disabled={!isConfigured} className="rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-700">Sign in</button>
            <button formAction={signUpAction} disabled={!isConfigured} className="rounded-md border border-gray-700 px-4 py-2 font-medium text-white hover:border-blue-500 disabled:cursor-not-allowed disabled:text-gray-500">Create account</button>
          </div>
        </form>
      </div>
    </main>
  );
}
