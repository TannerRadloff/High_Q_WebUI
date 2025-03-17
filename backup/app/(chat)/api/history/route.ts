import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/supabase/database'

// Force dynamic rendering for this route to handle cookies
export const dynamic = 'force-dynamic';

// Define a Chat type for TypeScript
type Chat = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  visibility?: string;
};

// Default empty history for fallback
const EMPTY_HISTORY: Chat[] = [];

/**
 * GET /api/history
 * Retrieves chat history data
 */
export async function GET(req: NextRequest) {
  try {
    // Get a robust database client
    const supabase = await getSupabaseClient();

    // Get the current user from the session
    const auth = await createServerClient();
    const { data: { session } } = await auth.auth.getSession();
    const user = session?.user;

    // If no authenticated user, return an empty history (soft failure)
    if (!user) {
      console.warn('[History API] No authenticated user, returning empty history');
      return NextResponse.json(EMPTY_HISTORY);
    }

    // Fetch chat history with better error handling
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[History API] Error fetching chat history:', error);
        // Return an empty array instead of failing
        return NextResponse.json(EMPTY_HISTORY);
      }

      // Return the chat history data
      return NextResponse.json(data || EMPTY_HISTORY);
    } catch (dbError) {
      console.error('[History API] Database error:', dbError);
      // Gracefully return empty results on database errors
      return NextResponse.json(EMPTY_HISTORY);
    }
  } catch (error) {
    console.error('[History API] Unexpected error:', error);
    // Always return a valid response even on errors
    return NextResponse.json(EMPTY_HISTORY);
  }
}


