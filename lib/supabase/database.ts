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

/**
 * Gets a Supabase client for server-side operations
 * Includes connection tracking, pooling, and error handling
 */
export async function getSupabaseClient() {
  try {
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials missing. Please check your environment variables.');
    }
    
    const now = Date.now();
    
    // Check if we have a valid connection in the pool
    if (
      connectionPool.client && 
      connectionPool.isConnected && 
      now - connectionPool.lastUsed < CONNECTION_TIMEOUT
    ) {
      console.log('Using existing Supabase client connection from pool');
      connectionPool.lastUsed = now;
      return connectionPool.client;
    }
    
    console.log('Initializing new Supabase client connection...');
    
    // Create a new client
    const supabase = await createClient();
    
    // Simple health check to verify connection
    const { data, error } = await supabase.from('message').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection health check failed:', error);
      
      // Track connection retries
      connectionPool.connectionRetries++;
      
      // If we've exceeded max retries, wait longer before trying again
      if (connectionPool.connectionRetries >= MAX_CONNECTION_RETRIES) {
        console.warn(`Exceeded maximum connection retries (${MAX_CONNECTION_RETRIES}). Backing off for longer period.`);
        // Reset retry counter but implement longer backoff later
        connectionPool.connectionRetries = 0;
      }
      
      throw error;
    }
    
    // Update the connection pool with the new client
    connectionPool.client = supabase;
    connectionPool.lastUsed = now;
    connectionPool.isConnected = true;
    connectionPool.connectionRetries = 0;
    
    console.log('Supabase connection established successfully');
    
    return supabase;
  } catch (error) {
    connectionPool.isConnected = false;
    console.error('Failed to initialize Supabase client:', error);
    throw error;
  }
} 