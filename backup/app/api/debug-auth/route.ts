import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client for the route handler
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // Check for session error
    if (sessionError) {
      return NextResponse.json({
        status: 'error',
        message: 'Error getting session',
        error: sessionError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Get cookie names from request directly since Next.js cookies() API doesn't have getAll
    const cookieHeader = request.headers.get('cookie') || ''
    const authCookies = cookieHeader
      .split(';')
      .map(c => {
        const [name, value] = c.trim().split('=')
        return { name, path: '/' }
      })
      .filter(cookie => 
        cookie.name.toLowerCase().includes('auth') || 
        cookie.name.toLowerCase().includes('sb-')
      )

    // Provide debug information about authentication state
    return NextResponse.json({
      status: 'success',
      authenticated: !!session,
      sessionExists: !!session,
      sessionExpiry: session?.expires_at 
        ? new Date(session.expires_at * 1000).toISOString() 
        : null,
      userExists: !!session?.user,
      userEmail: session?.user?.email,
      userInfo: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.email_confirmed_at !== null,
        metadata: session.user.user_metadata || {}
      } : null,
      cookies: {
        count: authCookies.length,
        names: authCookies.map(c => c.name),
        details: authCookies
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug-auth API error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Error in debug-auth API',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 