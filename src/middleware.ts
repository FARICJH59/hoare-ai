import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (use Upstash Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RPM = parseInt(process.env.RATE_LIMIT_RPM ?? '60', 10);
const WINDOW_MS = 60_000;

function getClientId(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS;
    rateLimitMap.set(clientId, { count: 1, resetAt });
    return { allowed: true, remaining: RPM - 1, resetAt };
  }

  if (entry.count >= RPM) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RPM - entry.count, resetAt: entry.resetAt };
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((v, k) => {
      if (now > v.resetAt) rateLimitMap.delete(k);
    });
  }, 5 * 60_000);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting for health checks and auth
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const clientId = getClientId(request);
  const { allowed, remaining, resetAt } = checkRateLimit(clientId);

  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
        { status: 429 },
      );

  response.headers.set('X-RateLimit-Limit', String(RPM));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
