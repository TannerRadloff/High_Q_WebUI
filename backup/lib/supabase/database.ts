/**
 * Enhanced Supabase Database Client
 * =================================
 * 
 * This module provides a robust Supabase client specifically for database operations.
 * It includes:
 * - Connection validation
 * - Error handling 
 * - Retry mechanisms
 * - Circuit breaker pattern
 * - Configurable timeouts
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Connection state management
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 8000; 
const lastConnectionError = { timestamp: 0, message: '' };

// Circuit breaker pattern for database connections
let connectionCircuitOpen = false;
let connectionAttempts = 0;

/**
 * Get a Supabase client for database operations with enhanced reliability
 */
export async function getSupabaseClient() {
  // Reset circuit breaker after 30 seconds
  if (connectionCircuitOpen && Date.now() - lastConnectionError.timestamp > 30000) {
    console.log('[DB] Resetting circuit breaker after 30s cooling period');
    connectionCircuitOpen = false;
    connectionAttempts = 0;
  }

  // Don't attempt new connections if circuit breaker is open
  if (connectionCircuitOpen) {
    console.warn('[DB] Circuit breaker open, not attempting new DB connection');
    throw new Error('Database connection temporarily disabled due to multiple failures');
  }
  
  try {
    // Create a new Supabase client
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          fetch: (url, options) => {
            // Set a timeout for database requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort();
            }, DEFAULT_TIMEOUT_MS);
            
            return fetch(url, {
              ...options,
              signal: controller.signal
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          }
        }
      }
    );
    
    // Test the connection with a lightweight ping
    try {
      const start = Date.now();
      const { error } = await supabase.from('chats').select('id').limit(1).maybeSingle();
      const elapsed = Date.now() - start;
      
      if (error) {
        console.error(`[DB] Connection test failed: ${error.message}`);
        throw error;
      }
      
      console.log(`[DB] Connection successful (${elapsed}ms)`);
      connectionAttempts = 0;
      return supabase;
    } catch (pingError) {
      // Handle ping failure
      connectionAttempts++;
      const errorMessage = pingError instanceof Error ? pingError.message : 'Unknown error';
      console.error(`[DB] Connection test failed (attempt ${connectionAttempts}): ${errorMessage}`);
      
      // Implement circuit breaker pattern
      if (connectionAttempts >= MAX_RETRIES) {
        connectionCircuitOpen = true;
        lastConnectionError.timestamp = Date.now();
        lastConnectionError.message = errorMessage;
        console.error(`[DB] Circuit breaker opened after ${MAX_RETRIES} failed attempts`);
        throw new Error(`Database connection failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
      // Recursive retry with backoff
      console.log(`[DB] Retrying connection (attempt ${connectionAttempts + 1})`);
      return getSupabaseClient();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DB] Failed to create Supabase client: ${errorMessage}`);
    throw error;
  }
} 