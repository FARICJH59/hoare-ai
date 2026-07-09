'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button }  from '@/components/ui/button';
import { Input }   from '@/components/ui/input';
import { Sparkles, Github } from 'lucide-react';

function SignInForm() {
  const searchParams  = useSearchParams();
  const callbackUrl   = searchParams.get('callbackUrl') ?? '/chat';
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email, password, callbackUrl, redirect: false,
    });
    setLoading(false);
    if (res?.error) setError('Invalid email or password.');
    else window.location.href = callbackUrl;
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => signIn('github', { callbackUrl })}
      >
        <Github className="w-4 h-4" />
        Continue with GitHub
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleCredentials} className="space-y-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Demo: <code className="bg-muted px-1 rounded">demo@hoare.ai</code> / <code className="bg-muted px-1 rounded">password123</code>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-7 h-7 text-blue-500" />
            <span className="text-2xl font-bold">HOARE.ai</span>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>
        <Suspense fallback={<div className="text-center text-muted-foreground text-sm">Loading…</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
