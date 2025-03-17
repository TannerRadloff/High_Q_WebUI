import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// Define public routes that don't require authentication
const PUBLIC_PATHS = [
  '/_next',
  '/api/auth',  
  '/api/register',
  '/api/check-env', 
  '/api/debug-auth',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/signin',
  '/auth-check',
  '/static',
  '/images',
  '/fonts'
]

// Constants for development logging
const DEV_MODE = process.env.NODE_ENV === 'development'

/**
 * Next.js middleware for authentication and route protection
 * 
 * This middleware:
 * 1. Allows public routes to be accessed without authentication
 * 2. Handles API routes differently from page routes
 * 3. Redirects unauthenticated users to login for protected routes
 * 4. Includes enhanced logging in development mode
 * 5. Special handling for Next.js data fetch requests to prevent 500 errors
 */
export async function middleware(request: NextRequest) {
  try {
    // SPECIAL CASE: Handle Next.js data fetches to prevent 500 errors
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // If this is a Next.js data request for index.json (homepage data)
    if (pathname.includes('/_next/data/') && pathname.endsWith('/index.json')) {
      // Check for auth cookies before trying to create the Supabase client
      const hasAuthCookies = checkSupabaseAuthCookies(request)
      
      if (!hasAuthCookies) {
        // Instead of 500 error, redirect to login with proper JSON response
        // This prevents the client from getting a 500 error
        console.log('[Middleware] Intercepting unauthenticated data request:', pathname)
        
        if (request.method === 'HEAD') {
          // For HEAD requests, just return a 307 redirect status
          return NextResponse.redirect(new URL('/login', request.url), { status: 307 })
        }
        
        // For full requests, return a proper JSON response
        const loginRedirectResponse = NextResponse.redirect(
          new URL('/login', request.url), 
          { status: 307 }
        )
        
        // Add content type for data requests
        loginRedirectResponse.headers.set('Content-Type', 'application/json')
        
        return loginRedirectResponse
      }
    }
    
    // Create a Supabase client configured to use cookies
    const { supabase, response } = createMiddlewareClient(request)

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
    await supabase.auth.getSession()

    return response
  } catch (e) {
    // Handle critical errors gracefully to avoid 500 responses
    console.error('[Middleware] Critical error:', e)
    
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // If this is a Next.js data request, return a specialized response instead of 500
    if (pathname.includes('/_next/data/')) {
      if (request.method === 'HEAD') {
        // For HEAD requests, respond with 307 redirect
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 })
      }
      
      // Create a proper JSON error response
      return NextResponse.json(
        { error: 'Authentication required', redirectTo: '/login' },
        { status: 401 }
      )
    }
    
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check your env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
    return NextResponse.next()
  }
}

/**
 * Check if the request has valid Supabase authentication cookies
 * 
 * More comprehensive check for all possible Supabase cookie naming patterns
 */
function checkSupabaseAuthCookies(request: NextRequest): boolean {
  // All possible Supabase cookie variations
  const cookieNames = [
    // Standard Supabase cookie names
    'sb-access-token',
    'sb-refresh-token',
    // Alternative cookie formats
    'sb-auth-token',
    'supabase-auth-token',
    // Legacy formats
    'sb:token',
    // JWT cookie
    'sb-id-token',
    // Session cookie
    'supabase-auth-session'
  ]
  
  // Check for any auth cookie that might exist
  const foundCookies = cookieNames.filter(name => request.cookies.has(name))
  
  // Also check for project-specific cookies (sb-*-auth-token)
  // Iterate through cookies manually to find project-specific tokens
  const projectCookies: string[] = []
  
  // Log all cookies in development mode for debugging
  if (DEV_MODE) {
    console.log('[Middleware] All cookies:', Array.from(request.cookies.entries()).map(([name]) => name))
  }
  
  request.cookies.forEach((value, name) => {
    // Check for any Supabase-related cookies with more flexible patterns
    if (
      (name.startsWith('sb-') && (
        name.includes('-auth-token') || 
        name.includes('access') || 
        name.includes('refresh')
      )) ||
      name.includes('supabase') ||
      name.includes('auth.token')
    ) {
      projectCookies.push(name)
    }
  })
  
  const hasAuthCookies = foundCookies.length > 0 || projectCookies.length > 0
  
  // Combine all found cookies for logging
  const allFoundCookies = [...foundCookies, ...projectCookies]
  
  if (DEV_MODE) {
    console.log('[Middleware] Auth cookies check:', {
      foundCookies: allFoundCookies,
      hasAuthCookies
    })
  }
  
  // For development, temporarily bypass auth check to debug the issue
  if (DEV_MODE && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true') {
    console.log('[Middleware] Development mode: Bypassing auth check')
    return true
  }
  
  return hasAuthCookies
}

/**
 * Classify the requested path
 */
function classifyPath(pathname: string) {
  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname.startsWith(path) || pathname.includes('.')
  )
  
  // Check for API routes
  const isApiRoute = pathname.startsWith('/api/')
  const isAuthRelatedApi = pathname.startsWith('/api/auth/') || 
                           pathname.startsWith('/api/register')
  
  // Special cases
  const isHomePage = pathname === '/'
  const isLoginPage = pathname === '/login'
  
  return { isPublicPath, isApiRoute, isAuthRelatedApi, isHomePage, isLoginPage }
}

/**
 * Handle API route authentication
 */
function handleApiRoute(pathname: string, isAuthRelatedApi: boolean, hasAuthCookies: boolean) {
  // Always allow auth-related APIs
  if (isAuthRelatedApi) {
    return NextResponse.next()
  }
  
  // For other APIs, check authentication
  if (!hasAuthCookies) {
    // Development bypass for easier testing
    if (DEV_MODE) {
      console.log('[Middleware] Development mode: Bypassing API auth check for', pathname)
      return NextResponse.next()
    }
    
    // Return 401 for unauthenticated API requests
    console.log('[Middleware] API auth failed, returning 401')
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  // Authenticated API request
  return NextResponse.next()
}

/**
 * Redirect unauthenticated users to login
 */
function redirectToLogin(request: NextRequest, pathname: string) {
  if (DEV_MODE) {
    console.log('[Middleware] Redirecting to login - no auth cookies', {
      url: request.url,
      path: pathname
    })
  }
  
  // Check for potential redirect loops
  const referer = request.headers.get('referer')
  const url = new URL(request.url)
  
  // If we detect a pattern that might be a loop
  // e.g. referer is /login and we're trying to redirect back to login
  // or referer contains our domain and pathname is root
  if (referer && (
      (referer.includes('/login') && pathname === '/') || 
      (url.hostname === new URL(referer).hostname && pathname === '/')
    )) {
    console.log('[Middleware] Detected potential redirect loop, breaking the chain', {
      referer,
      pathname
    })
    
    // Break the loop by allowing access
    return NextResponse.next()
  }
  
  // Save the original URL to redirect back after login
  const redirectUrl = new URL('/login', request.url)
  
  // Add the current path as a redirect parameter (excluding login page)
  if (pathname !== '/login') {
    redirectUrl.searchParams.set('redirect', pathname)
  }
  
  if (DEV_MODE) {
    console.log('[Middleware] Redirecting to:', redirectUrl.toString())
  }
  
  return NextResponse.redirect(redirectUrl)
}

/**
 * Handle errors in middleware
 */
function handleMiddlewareError(error: unknown, request: NextRequest) {
  console.error('[Middleware] Error:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    url: request.url
  })
  
  // On error, redirect to login for safety, but don't cause a loop
  const isLoginPage = new URL(request.url).pathname === '/login'
  if (!isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  } else {
    // If already on login page, just proceed
    return NextResponse.next()
  }
}

/**
 * Development logging helpers
 */
function logRequest(pathname: string, method: string) {
  if (DEV_MODE) {
    console.log('[Middleware] Processing request:', {
      pathname,
      method
    })
  }
}

function logAllowAccess(pathname: string, reason: string) {
  if (DEV_MODE) {
    console.log(`[Middleware] Allowing access to ${pathname} (${reason})`)
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/* (image files)
     * - public/* (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|public/).*)',
  ],
} 