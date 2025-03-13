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
  console.log('[Middleware] Session cookie:', sessionCookie ? 'present' : 'absent')
  
  // Always allow callback routes - critical for OAuth flows
  if (isCallbackRoute) {
    console.log('[Middleware] Allowing OAuth callback')
    return NextResponse.next()
  }

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    console.log('[Middleware] Redirecting unauthenticated user to login')
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    
    // Set cookie to expire immediately
    response.headers.set(
      'Set-Cookie',
      'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    )
    
    return response
  }

  // Redirect authenticated users trying to access auth routes
  if (isAuthRoute && isAuthenticated) {
    console.log('[Middleware] Redirecting authenticated user to home')
    return NextResponse.redirect(new URL('/', request.url))
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
    
    // Redirect to main app if authenticated, login if not
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    } else {
      // Clear any invalid cookies when redirecting to login
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      
      // Set cookie to expire immediately
      response.headers.set(
        'Set-Cookie',
        'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      )
      
      return response
    }
  }

  // For all other routes, proceed normally
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/:path*'],
} 