import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Initialize Supabase middleware client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Get the session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Define paths that don't require authentication
  const publicPaths = [
    '/auth/login', 
    '/auth/signup', 
    '/auth/forgot-password',
    '/auth/callback',
  ];

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // If there's no session and the path requires authentication, redirect to login
  if (!session && !isPublicPath) {
    const redirectUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If there's a session and user is on auth pages, redirect to home
  if (session && isPublicPath) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// Define which paths this middleware should run on
export const config = {
  matcher: [
    // Apply to all routes except for static files, api routes, etc.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 