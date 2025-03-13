import { NextResponse, type NextRequest } from 'next/server'

// This middleware handles authentication routing for the application
export async function middleware(request: NextRequest) {
  // Check auth status based on a session cookie
  const sessionCookie = request.cookies.get('sb-access-token')
  const isAuthenticated = sessionCookie !== undefined

  // Get the current URL path
  const url = new URL(request.url)
  const pathname = url.pathname
  const referer = request.headers.get('referer') || 'none'

  // Debug information to diagnose redirect loops
  console.log(`[Middleware] Request:`, {
    path: pathname,
    authenticated: isAuthenticated,
    referer,
    cookieNames: Array.from(request.cookies.keys()),
  })

  // Define route categories
  const isAuthRoute = pathname === '/login' || 
                     pathname === '/register' || 
                     pathname === '/forgot-password' || 
                     pathname === '/reset-password'
                     
  const isCallbackRoute = pathname.startsWith('/auth/callback')
  
  const isApiRoute = pathname.startsWith('/api')
  
  const isPublicRoute = isAuthRoute || 
                        isCallbackRoute || 
                        isApiRoute || 
                        pathname.startsWith('/_next') || 
                        pathname.includes('.') // Static files

  const isProtectedRoute = pathname.startsWith('/') && !isPublicRoute

  // Special case for root path which should show chat UI for authenticated users,
  // but allow public access with redirect to login option
  const isRootPath = pathname === '/'
  
  // Check for chat-home route which requires authentication
  const isChatHomePath = pathname === '/chat-home'

  // Always allow callback routes - critical for OAuth flows
  if (isCallbackRoute) {
    console.log('[Middleware] Allowing OAuth callback')
    return NextResponse.next()
  }

  // Always allow access to the root path and let the client decide what to show
  // This prevents redirect loops between / and /login
  if (isRootPath) {
    console.log('[Middleware] Allowing access to root path, client will handle auth state')
    return NextResponse.next()
  }

  // Handle chat-home route - requires authentication
  if (isChatHomePath && !isAuthenticated) {
    console.log('[Middleware] Redirecting unauthenticated user from chat-home to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect unauthenticated users trying to access protected routes (except root)
  if (isProtectedRoute && !isRootPath && !isAuthenticated) {
    console.log('[Middleware] Redirecting unauthenticated user to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users trying to access auth routes
  if (isAuthRoute && isAuthenticated) {
    console.log('[Middleware] Redirecting authenticated user to home')
    return NextResponse.redirect(new URL('/chat-home', request.url))
  }

  // If there are any old NextAuth pages/routes being accessed, block them completely
  // and redirect to the new Supabase auth routes
  if (pathname === '/pages/login' || 
      pathname.startsWith('/api/auth/signin') || 
      pathname.startsWith('/api/auth/callback') ||
      pathname.startsWith('/api/auth/signout') ||
      pathname.includes('/auth/signin') ||
      pathname.includes('/auth/signout')) {
    console.log('[Middleware] Blocking old NextAuth route:', pathname)
    
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/chat-home', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // For all other routes, proceed normally
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/:path*'],
} 