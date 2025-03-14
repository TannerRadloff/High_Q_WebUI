import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const PUBLIC_PATHS = [
  '/_next',
  '/api/auth',  
  '/api/register',
  '/api/check-env', 
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/signin',
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
 */
export function middleware(request: NextRequest) {
  try {
    // Extract URL information
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // Development logging
    logRequest(pathname, request.method)

    // Check for all possible Supabase cookie names
    const hasAuthCookies = checkSupabaseAuthCookies(request)
    
    // Path classification
    const pathInfo = classifyPath(pathname)
    
    // Log path classification in development
    if (DEV_MODE) {
      console.log('[Middleware] Route check:', {
        pathname,
        ...pathInfo,
        hasAuthCookies,
        matchedPublicPath: PUBLIC_PATHS.find(path => pathname.startsWith(path))
      })
    }

    // RULE 1: Allow public routes and home page without authentication
    if (pathInfo.isPublicPath || pathInfo.isHomePage) {
      logAllowAccess(pathname, 'public route')
      return NextResponse.next()
    }
    
    // RULE 2: Handle API routes
    if (pathInfo.isApiRoute) {
      return handleApiRoute(pathname, pathInfo.isAuthRelatedApi, hasAuthCookies)
    }

    // RULE 3: For protected routes, check authentication
    if (!hasAuthCookies) {
      return redirectToLogin(request, pathname)
    }

    // RULE 4: Allow authenticated access to protected routes
    logAllowAccess(pathname, 'authenticated access')
    return NextResponse.next()
  } catch (error) {
    return handleMiddlewareError(error, request)
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
    'sb-id-token'
  ]
  
  // Check for any auth cookie that might exist
  const foundCookies = cookieNames.filter(name => request.cookies.has(name))
  
  // Also check for project-specific cookies (sb-*-auth-token)
  // Iterate through cookies manually to find project-specific tokens
  const projectCookies: string[] = []
  request.cookies.forEach((value, name) => {
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 