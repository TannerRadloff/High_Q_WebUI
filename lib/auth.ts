'use server'

import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Create a server action to handle OAuth callback
export async function handleOAuthCallback(code: string) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
  
  // Exchange the code for a session
  await supabase.auth.exchangeCodeForSession(code)
} 