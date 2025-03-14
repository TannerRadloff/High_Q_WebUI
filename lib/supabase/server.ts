import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function getSupabaseServerClient() {
  // Use the auth-helpers-nextjs package which has better compatibility
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
} 