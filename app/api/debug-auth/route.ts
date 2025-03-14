import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

/**
 * Debug API route to check authentication status and cookies
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Check session
    const { data, error } = await supabase.auth.getSession()
    
    // Get cookie names from request directly
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieNames = cookieHeader
      .split(';')
      .map(c => c.trim().split('=')[0])
      .filter(name => 
        name.startsWith('sb-') || 
        name.includes('supabase') || 
        name.includes('auth')
      )
    
    // Prepare response data
    const responseData = {
      authenticated: !!data.session,
      sessionInfo: data.session ? {
        userId: data.session.user.id,
        email: data.session.user.email,
        expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
        currentTime: new Date().toISOString(),
      } : null,
      error: error ? { message: error.message, code: error.code } : null,
      cookies: {
        cookieHeader: cookieHeader ? 'Present' : 'Missing',
        authCookieNames: cookieNames
      },
      headers: {
        userAgent: request.headers.get('user-agent'),
        host: request.headers.get('host'),
        referer: request.headers.get('referer'),
      }
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[Debug Auth API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null
      }, 
      { status: 500 }
    )
  }
} 