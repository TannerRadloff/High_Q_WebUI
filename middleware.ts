import { NextResponse, type NextRequest } from 'next/server'

// This is a simplified middleware that doesn't handle sessions
// For a production site, you'll want to implement proper cookie handling
export async function middleware(request: NextRequest) {
  // Check auth status based on a session cookie
  const sessionCookie = request.cookies.get('sb-access-token')
  const isAuthenticated = sessionCookie !== undefined

  // Get the current URL path
  const url = new URL(request.url)
  const pathname = url.pathname

  // Define route categories
  const isAuthRoute = pathname.startsWith('/login') || 
                     pathname.startsWith('/register') || 
                     pathname.startsWith('/forgot-password') || 
                     pathname.startsWith('/reset-password')
                     
  const isCallbackRoute = pathname.startsWith('/auth/callback')
  
  const isApiRoute = pathname.startsWith('/api')
  
  const isPublicRoute = isAuthRoute || 
                        isCallbackRoute || 
                        isApiRoute || 
                        pathname.startsWith('/_next') || 
                        pathname.includes('.') // Static files

  const isProtectedRoute = pathname.startsWith('/') && !isPublicRoute

  // Debug middleware execution
  console.log(`[Middleware] Path: ${pathname}, Authenticated: ${isAuthenticated}`)
  
  // Always allow callback routes - critical for OAuth flows
  if (isCallbackRoute) {
    console.log('[Middleware] Allowing OAuth callback')
    return NextResponse.next()
  }

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    console.log('[Middleware] Redirecting unauthenticated user to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users trying to access auth routes
  if (isAuthRoute && isAuthenticated) {
    console.log('[Middleware] Redirecting authenticated user to home')
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/:path*'],
} 