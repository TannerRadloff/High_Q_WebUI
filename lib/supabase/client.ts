import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Cache the client instance to avoid creating multiple instances
let cachedClient: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export const createClient = () => {
  // If we already have a client instance, return it
  if (cachedClient) {
    return cachedClient;
  }
  
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
    // Create the client with default settings which will enable cookies
    // Use the createClientComponentClient which is designed for client components
    cachedClient = createClientComponentClient<Database>();
    
    // Log the session status on client creation
    if (cachedClient) {
      cachedClient.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error('Error checking session:', error)
        } else {
          console.log('Session available on client creation:', !!data.session)
        }
      }).catch(err => {
        console.error('Unexpected error checking session:', err)
      });
    }
    
    return cachedClient;
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error;
  }
} 