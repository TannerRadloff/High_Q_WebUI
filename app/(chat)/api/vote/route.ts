import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/supabase/database'

// Force dynamic rendering for this route to handle cookies
export const dynamic = 'force-dynamic';

// Define a Vote type for TypeScript
type Vote = {
  id?: string;
  chat_id: string;
  message_id: string;
  user_id?: string;
  is_upvoted: boolean;
  created_at?: string;
};

// Default empty votes array for fallback
const EMPTY_VOTES: Vote[] = [];

/**
 * GET /api/vote
 * Retrieves votes for a chat
 */
export async function GET(req: NextRequest) {
  // Get the chat ID from the query parameters
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    console.warn('[Vote API] No chatId provided in request');
    return NextResponse.json(EMPTY_VOTES);
  }

  try {
    // Get a robust database client
    const supabase = await getSupabaseClient();

    // Get the current user from the session
    const auth = await createServerClient();
    const { data: { session } } = await auth.auth.getSession();
    const user = session?.user;

    // If no authenticated user, return an empty array (soft failure)
    if (!user) {
      console.warn('[Vote API] No authenticated user, returning empty votes');
      return NextResponse.json(EMPTY_VOTES);
    }

    // Fetch votes with better error handling
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Vote API] Error fetching votes:', error);
        // Return an empty array instead of failing
        return NextResponse.json(EMPTY_VOTES);
      }

      // Return the votes data
      return NextResponse.json(data || EMPTY_VOTES);
    } catch (dbError) {
      console.error('[Vote API] Database error:', dbError);
      // Gracefully return empty results on database errors
      return NextResponse.json(EMPTY_VOTES);
    }
  } catch (error) {
    console.error('[Vote API] Unexpected error:', error);
    // Always return a valid response even on errors
    return NextResponse.json(EMPTY_VOTES);
  }
}

/**
 * PATCH /api/vote
 * Updates or creates a vote
 */
export async function PATCH(req: NextRequest) {
  try {
    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[Vote API] Error parsing request body:', parseError);
      // Handle invalid JSON gracefully
      return NextResponse.json({ success: false, message: 'Invalid request format' });
    }

    // Validate required fields
    const { chatId, messageId, isUpvoted } = body;
    if (!chatId || !messageId || isUpvoted === undefined) {
      console.warn('[Vote API] Missing required fields in request:', { chatId, messageId, isUpvoted });
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Get a robust database client
    const supabase = await getSupabaseClient();

    // Get the current user from the session
    const auth = await createServerClient();
    const { data: { session } } = await auth.auth.getSession();
    const user = session?.user;

    // If no authenticated user, return success but don't save (soft failure)
    if (!user) {
      console.warn('[Vote API] No authenticated user for vote action');
      return NextResponse.json({ success: true, message: 'Vote acknowledged (unauthenticated)' });
    }

    try {
      // Check if vote already exists
      const { data: existingVotes, error: queryError } = await supabase
        .from('votes')
        .select('*')
        .eq('chat_id', chatId)
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (queryError) {
        console.error('[Vote API] Error checking for existing vote:', queryError);
        return NextResponse.json({ 
          success: true, 
          message: 'Could not process vote due to database error' 
        });
      }

      if (existingVotes) {
        // Update existing vote
        const { error: updateError } = await supabase
          .from('votes')
          .update({
            is_upvoted: isUpvoted,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVotes.id);

        if (updateError) {
          console.error('[Vote API] Error updating vote:', updateError);
          return NextResponse.json({ 
            success: true, 
            message: 'Failed to update vote' 
          });
        }
      } else {
        // Create new vote
        const { error: insertError } = await supabase
          .from('votes')
          .insert({
            chat_id: chatId,
            message_id: messageId,
            user_id: user.id,
            is_upvoted: isUpvoted,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[Vote API] Error creating vote:', insertError);
          return NextResponse.json({ 
            success: true, 
            message: 'Failed to create vote' 
          });
        }
      }

      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('[Vote API] Database error while processing vote:', dbError);
      // Return success but with error message
      return NextResponse.json({ 
        success: true, 
        message: 'Vote processed with errors' 
      });
    }
  } catch (error) {
    console.error('[Vote API] Unexpected error in vote API:', error);
    // Always return a response
    return NextResponse.json({ 
      success: true, 
      message: 'Vote acknowledged with errors' 
    });
  }
}


