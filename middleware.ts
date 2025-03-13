import { NextResponse, type NextRequest } from 'next/server'

// This is a simplified middleware that doesn't handle sessions
// For a production site, you'll want to implement proper cookie handling
export async function middleware(request: NextRequest) {
  // Check auth status based on a session cookie
  const sessionCookie = request.cookies.get('sb-access-token')
  const isAuthenticated = sessionCookie !== undefined

  // Check auth status for protected routes
  const url = new URL(request.url)
  const isAuthRoute = url.pathname.startsWith('/login') || 
                       url.pathname.startsWith('/register') || 
                       url.pathname.startsWith('/forgot-password') || 
                       url.pathname.startsWith('/reset-password')
                       
  const isProtectedRoute = url.pathname.startsWith('/') && 
                          !url.pathname.startsWith('/api') && 
                          !url.pathname.startsWith('/auth') &&
                          !isAuthRoute

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users trying to access auth routes
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/:path*', '/api/:path*', '/login', '/register', '/forgot-password', '/reset-password'],
} 