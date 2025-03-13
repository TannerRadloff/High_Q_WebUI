import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function getSupabaseServerClient() {
  // Use the auth-helpers-nextjs package which has better compatibility
  return createServerComponentClient<Database>({ cookies })
} 