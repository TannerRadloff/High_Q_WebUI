import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { Session } from '@supabase/supabase-js';

// Replacement for the NextAuth auth() function
// This function returns a Supabase session object
export async function getServerSession(): Promise<Session | null> {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error in getServerSession:', error);
    return null;
  }
} 