'use server'

import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { Session } from '@supabase/supabase-js'

// =============================================================================
// Session Management
// =============================================================================

/**
 * Gets the current Supabase session from the server
 * Replacement for the NextAuth auth() function
 * @returns The Supabase session object or null if not authenticated
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    // Create the Supabase client with the correct cookies implementation
    // In Next.js 14+, cookies() needs to be awaited
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore
    })
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Unexpected error in getServerSession:', error)
    return null
  }
}

// =============================================================================
// OAuth Handling
// =============================================================================

/**
 * Handle the OAuth callback from authentication providers
 * Used in the callback route to complete the authentication flow
 * @param code The authorization code from the OAuth provider
 * @returns The session data if successful
 */
export async function handleOAuthCallback(code: string) {
  console.log('[handleOAuthCallback] Starting with code', code.substring(0, 5) + '...')
  
  if (!code) {
    console.error('[handleOAuthCallback] No code provided')
    throw new Error('No authorization code provided')
  }

  try {
    // Create a Supabase client for server-side operations with the correct cookies implementation
    console.log('[handleOAuthCallback] Creating Supabase client')
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore
    })
    
    // Exchange the code for a session
    console.log('[handleOAuthCallback] Calling exchangeCodeForSession')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[handleOAuthCallback] Error exchanging code for session:', error)
      throw error
    }
    
    console.log('[handleOAuthCallback] Successfully exchanged code for session:', {
      hasSession: !!data.session,
      user: data.user?.email
    })
    
    return data
  } catch (error) {
    console.error('[handleOAuthCallback] Unexpected error:', error)
    throw error
  }
} 