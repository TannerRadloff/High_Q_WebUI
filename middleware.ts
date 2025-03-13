import { NextResponse, type NextRequest } from 'next/server'

// This middleware handles authentication routing for the application
export async function middleware(request: NextRequest) {
  // Check auth status based on a session cookie
  const sessionCookie = request.cookies.get('sb-access-token')
  const isAuthenticated = sessionCookie !== undefined

  // Get the current URL path
  const url = new URL(request.url)
  const pathname = url.pathname

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
    // Make sure we're redirecting to the correct Supabase login page
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users trying to access auth routes
  if (isAuthRoute && isAuthenticated) {
    console.log('[Middleware] Redirecting authenticated user to home')
    // Make sure we're redirecting to the main chat interface
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If there are any old NextAuth pages/routes being accessed, redirect to the equivalent app/ routes
  if (pathname === '/pages/login' || 
      pathname.startsWith('/api/auth/signin') || 
      pathname.startsWith('/api/auth/callback') ||
      pathname.startsWith('/api/auth/signout') ||
      pathname.includes('/auth/signin') ||
      pathname.includes('/auth/signout')) {
    console.log('[Middleware] Redirecting from old NextAuth route to Supabase login:', pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/:path*'],
} 