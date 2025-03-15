import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Connection pool management
interface ConnectionPool {
  client: SupabaseClient | null;
  lastUsed: number;
  isConnected: boolean;
  connectionRetries: number;
}

// Initialize connection pool
const connectionPool: ConnectionPool = {
  client: null,
  lastUsed: 0,
  isConnected: false,
  connectionRetries: 0,
};

// Connection timeout (5 minutes)
const CONNECTION_TIMEOUT = 5 * 60 * 1000;
// Maximum connection retries
const MAX_CONNECTION_RETRIES = 5;
// Backoff time in ms (starts at 1 second)
const INITIAL_BACKOFF = 1000;

/**
 * Gets a Supabase client for server-side operations
 * Includes connection tracking, pooling, and error handling
 */
export async function getSupabaseClient() {
  try {
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Supabase] Missing credentials in environment variables');
      throw new Error('Supabase credentials missing. Please check your environment variables.');
    }
    
    const now = Date.now();
    
    // Check if we have a valid connection in the pool
    if (
      connectionPool.client && 
      connectionPool.isConnected && 
      now - connectionPool.lastUsed < CONNECTION_TIMEOUT
    ) {
      console.log('[Supabase] Using existing client connection from pool');
      connectionPool.lastUsed = now;
      return connectionPool.client;
    }
    
    console.log('[Supabase] Initializing new client connection...');
    
    // Create a new client
    const supabase = await createClient();
    
    // Simple health check to verify connection
    try {
      const { data, error } = await supabase.from('message').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.error('[Supabase] Connection health check failed:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details
        });
        
        // Track connection retries
        connectionPool.connectionRetries++;
        
        // Calculate backoff time based on retry count (exponential backoff)
        const backoffTime = INITIAL_BACKOFF * Math.pow(2, connectionPool.connectionRetries - 1);
        
        // If we've exceeded max retries, wait longer before trying again
        if (connectionPool.connectionRetries >= MAX_CONNECTION_RETRIES) {
          console.warn(`[Supabase] Exceeded maximum connection retries (${MAX_CONNECTION_RETRIES}). Backing off for ${backoffTime}ms.`);
          
          // Wait for backoff time, then reset retry counter
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          connectionPool.connectionRetries = 0;
        }
        
        throw error;
      }
    } catch (healthCheckError) {
      console.error('[Supabase] Health check failed with exception:', healthCheckError);
      
      // Treat any exception during health check as a connection error
      connectionPool.isConnected = false;
      throw healthCheckError;
    }
    
    // Update the connection pool with the new client
    connectionPool.client = supabase;
    connectionPool.lastUsed = now;
    connectionPool.isConnected = true;
    connectionPool.connectionRetries = 0;
    
    console.log('[Supabase] Connection established successfully');
    
    return supabase;
  } catch (error) {
    connectionPool.isConnected = false;
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error('[Supabase] Failed to initialize client:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      console.error('[Supabase] Failed to initialize client with unknown error:', error);
    }
    throw error;
  }
} 