import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handleOAuthCallback } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Callback handler for OAuth authentication
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    
    // Log the callback request for debugging
    console.log('[Auth Callback] Processing OAuth callback', {
      url: requestUrl.toString(),
      hasCode: requestUrl.searchParams.has('code')
    })
    
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')
    
    // Handle any errors from the OAuth provider
    if (error) {
      console.error('[Auth Callback] OAuth provider returned an error:', error, errorDescription)
      // Redirect to the login page with error info
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`, requestUrl.origin))
    }
    
    // Code should always be present for successful OAuth callback
    if (!code) {
      console.error('[Auth Callback] No code parameter found in callback URL')
      return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
    }
    
    // Exchange the code for a session
    console.log('[Auth Callback] Exchanging code for session')
    await handleOAuthCallback(code)
    console.log('[Auth Callback] Session exchange completed')

    // Log any old NextAuth cookies that might exist (for debugging)
    const oldCookies = ['next-auth.session-token', 'next-auth.callback-url', 'next-auth.csrf-token']
    oldCookies.forEach(cookieName => {
      if (request.cookies.has(cookieName)) {
        console.log('[Auth Callback] Found old NextAuth cookie:', cookieName)
      }
    })

    // Force a redirect to the main application route
    // This should bypass any old auth middleware and use our new middleware logic
    console.log('[Auth Callback] Redirecting to main application')
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (error) {
    console.error('[Auth Callback] Error processing OAuth callback:', error)
    // If there's an error, redirect to the login page
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url))
  }
} 

