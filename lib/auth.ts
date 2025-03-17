import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// Helper function to verify authentication
export async function verifyAuth() {
  const cookieStore = cookies();
  const supabaseServer = createRouteHandlerClient({ cookies: () => cookieStore });
  
  const { data: { session }, error } = await supabaseServer.auth.getSession();
  
  if (error || !session) {
    return { authenticated: false, userId: null, error };
  }
  
  return { authenticated: true, userId: session.user.id, error: null };
}

// Middleware to check authentication for API routes
export async function withAuth(handler: Function) {
  return async (request: Request, context: any) => {
    const { authenticated, userId, error: authError } = await verifyAuth();
    
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Authentication required', details: authError },
        { status: 401 }
      );
    }
    
    // Add userId to the context
    context.userId = userId;
    
    // Call the original handler
    return handler(request, context);
  };
} 