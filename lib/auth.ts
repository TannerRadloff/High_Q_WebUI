'use server'

import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Create a server action to handle OAuth callback
export async function handleOAuthCallback(code: string) {
  console.log('[handleOAuthCallback] Starting with code', code.substring(0, 5) + '...')
  
  if (!code) {
    console.error('[handleOAuthCallback] No code provided')
    throw new Error('No authorization code provided')
  }

  try {
    // Get cookie store
    const cookieStore = cookies()
    
    // Create a Supabase client for server-side operations
    console.log('[handleOAuthCallback] Creating Supabase client')
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
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