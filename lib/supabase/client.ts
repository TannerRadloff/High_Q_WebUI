import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const createClient = () => {
  // Debug Supabase environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing:', {
      urlAvailable: !!supabaseUrl,
      keyAvailable: !!supabaseKey
    })
  } else {
    console.log('Supabase client initialized with env variables')
  }
  
  try {
    return createClientComponentClient<Database>()
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error
  }
} 