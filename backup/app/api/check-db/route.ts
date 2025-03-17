import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/database';
import { createServerClient } from '@/lib/supabase/server';

// Interface for the diagnostic information
interface Diagnostics {
  timestamp: string;
  environment: {
    nodeEnv: string;
    hasSupabaseUrl: boolean;
    hasSupabaseKey: boolean;
  };
  connectionResults: {
    success: boolean;
    error?: string;
    elapsed?: number;
    details?: any;
    userAuthenticated?: boolean;
  };
}

/**
 * GET /api/check-db
 * Diagnostic endpoint to check database connectivity
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  // Prepare diagnostic information
  const diagnostics: Diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    connectionResults: {
      success: false
    }
  };
  
  try {
    // Check auth connectivity first
    try {
      const auth = await createServerClient();
      const { data: { session } } = await auth.auth.getSession();
      diagnostics.connectionResults.userAuthenticated = !!session?.user;
    } catch (authError: any) {
      console.error('[Diagnostic] Auth client error:', authError);
      diagnostics.connectionResults.error = `Auth error: ${authError.message || 'Unknown error'}`;
    }
    
    // Try to connect to the database
    try {
      const supabase = await getSupabaseClient();
      const start = Date.now();
      
      // Perform a simple query
      const { data, error } = await supabase
        .from('chats')
        .select('id')
        .limit(1);
      
      const elapsed = Date.now() - start;
      
      if (error) {
        diagnostics.connectionResults.success = false;
        diagnostics.connectionResults.error = error.message;
        diagnostics.connectionResults.details = {
          code: error.code,
          hint: error.hint,
          details: error.details
        };
      } else {
        diagnostics.connectionResults.success = true;
        diagnostics.connectionResults.elapsed = elapsed;
        diagnostics.connectionResults.details = {
          message: 'Successfully connected to database',
          recordsFound: Array.isArray(data) ? data.length : 0
        };
      }
    } catch (dbError: any) {
      diagnostics.connectionResults.success = false;
      diagnostics.connectionResults.error = dbError.message || 'Unknown database error';
      if (dbError.stack) {
        diagnostics.connectionResults.details = {
          stack: dbError.stack.split('\n')[0],
          name: dbError.name
        };
      }
    }
    
    return NextResponse.json(diagnostics);
  } catch (error: any) {
    diagnostics.connectionResults.success = false;
    diagnostics.connectionResults.error = error.message || 'Unexpected error in diagnostic endpoint';
    
    return NextResponse.json(diagnostics);
  }
} 