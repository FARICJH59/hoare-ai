import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <Sparkles className="w-10 h-10 text-blue-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Authentication error</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Something went wrong during sign in. Please try again.
        </p>
        <Link href="/auth/signin">
          <Button>Try again</Button>
        </Link>
      </div>
    </div>
  );
}
