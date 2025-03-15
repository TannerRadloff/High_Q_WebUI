import { createServerComponentClient, createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { cache } from 'react'

// Cache the client creation to improve performance
export const getSupabaseServerClient = cache(async () => {
  // Use the auth-helpers-nextjs package which has better compatibility
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  try {
    // Verify the session - log info but don't throw to prevent page crashes
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting server session:', error.message)
    } else {
      if (data.session) {
        console.log('Server session found, user authenticated')
      } else {
        console.log('No server session found, user not authenticated')
      }
    }
    
    return supabase
  } catch (err) {
    console.error('Unexpected error in getSupabaseServerClient:', err)
    // Still return the client even if session check fails
    return supabase
  }
})

// Server action client - specifically for use in server actions
export async function getSupabaseActionClient() {
  const cookieStore = cookies()
  return createServerActionClient<Database>({ cookies: () => cookieStore })
}

// Simple createClient function for compatibility with the example code
export function createClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
} 