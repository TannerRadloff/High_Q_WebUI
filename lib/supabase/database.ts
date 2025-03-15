import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Connection pool management
interface ConnectionPool {
  client: SupabaseClient | null;
  lastUsed: number;
  isConnected: boolean;
  connectionRetries: number;
  lastErrorTime?: number;
  consecutiveErrors: number;
  totalConnections: number;
  successfulConnections: number;
}

// Initialize connection pool
const connectionPool: ConnectionPool = {
  client: null,
  lastUsed: 0,
  isConnected: false,
  connectionRetries: 0,
  consecutiveErrors: 0,
  totalConnections: 0,
  successfulConnections: 0
};

// Connection timeout (5 minutes)
const CONNECTION_TIMEOUT = 5 * 60 * 1000;
// Maximum connection retries
const MAX_CONNECTION_RETRIES = 5;
// Backoff time in ms (starts at 1 second)
const INITIAL_BACKOFF = 1000;
// Circuit breaker threshold - break after 10 consecutive errors within 1 minute
const CIRCUIT_BREAKER_ERROR_THRESHOLD = 10;
const CIRCUIT_BREAKER_TIME_WINDOW = 60 * 1000; // 1 minute

/**
 * Gets a Supabase client for server-side operations
 * Includes connection tracking, pooling, and error handling
 */
export async function getSupabaseClient() {
  const traceId = Math.random().toString(36).substring(2, 10);
  const startTime = performance.now();
  const metrics = {
    connectionReused: false,
    connectionCreated: false,
    healthCheckPerformed: false,
    healthCheckSuccess: false,
    duration: 0
  };

  try {
    // Log initial connection request
    console.log(`[Supabase][${traceId}] Connection request initiated`);
    
    // Implement circuit breaker pattern
    if (
      connectionPool.consecutiveErrors >= CIRCUIT_BREAKER_ERROR_THRESHOLD &&
      connectionPool.lastErrorTime &&
      Date.now() - connectionPool.lastErrorTime < CIRCUIT_BREAKER_TIME_WINDOW
    ) {
      console.error(`[Supabase][${traceId}] CIRCUIT BREAKER OPEN: Too many consecutive errors (${connectionPool.consecutiveErrors}). Blocking new connections temporarily.`);
      throw new Error('Database connection circuit breaker is open');
    }
    
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error(`[Supabase][${traceId}] Missing credentials in environment variables`);
      throw new Error('Supabase credentials missing. Please check your environment variables.');
    }
    
    const now = Date.now();
    
    // Check if we have a valid connection in the pool
    if (
      connectionPool.client && 
      connectionPool.isConnected && 
      now - connectionPool.lastUsed < CONNECTION_TIMEOUT
    ) {
      metrics.connectionReused = true;
      console.log(`[Supabase][${traceId}] Using existing client connection from pool. Age: ${(now - connectionPool.lastUsed) / 1000}s`);
      connectionPool.lastUsed = now;
      
      // Complete performance tracking
      metrics.duration = performance.now() - startTime;
      console.log(`[Supabase][${traceId}] Connection response time: ${metrics.duration.toFixed(2)}ms`, metrics);
      
      return connectionPool.client;
    }
    
    console.log(`[Supabase][${traceId}] Initializing new client connection... (Previous connection age: ${connectionPool.lastUsed ? (now - connectionPool.lastUsed) / 1000 : 'N/A'}s)`);
    metrics.connectionCreated = true;
    connectionPool.totalConnections++;
    
    // Create a new client
    const supabase = await createClient();
    
    // Simple health check to verify connection
    metrics.healthCheckPerformed = true;
    try {
      console.log(`[Supabase][${traceId}] Performing health check...`);
      
      const healthCheckStart = performance.now();
      const { data, error } = await supabase.from('message').select('count(*)', { count: 'exact', head: true });
      const healthCheckDuration = performance.now() - healthCheckStart;
      
      console.log(`[Supabase][${traceId}] Health check completed in ${healthCheckDuration.toFixed(2)}ms`);
      
      if (error) {
        metrics.healthCheckSuccess = false;
        connectionPool.consecutiveErrors++;
        connectionPool.lastErrorTime = Date.now();
        
        console.error(`[Supabase][${traceId}] Connection health check failed:`, {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          consecutiveErrors: connectionPool.consecutiveErrors,
          totalConnAttempts: connectionPool.totalConnections,
          successConnections: connectionPool.successfulConnections,
          errorRate: (connectionPool.totalConnections - connectionPool.successfulConnections) / connectionPool.totalConnections
        });
        
        // Track connection retries
        connectionPool.connectionRetries++;
        
        // Calculate backoff time based on retry count (exponential backoff)
        const backoffTime = INITIAL_BACKOFF * Math.pow(2, connectionPool.connectionRetries - 1);
        
        // If we've exceeded max retries, wait longer before trying again
        if (connectionPool.connectionRetries >= MAX_CONNECTION_RETRIES) {
          console.warn(`[Supabase][${traceId}] Exceeded maximum connection retries (${MAX_CONNECTION_RETRIES}). Backing off for ${backoffTime}ms.`);
          
          // Wait for backoff time, then reset retry counter
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          connectionPool.connectionRetries = 0;
        }
        
        throw error;
      }
      
      // Health check succeeded
      metrics.healthCheckSuccess = true;
    } catch (healthCheckError) {
      metrics.healthCheckSuccess = false;
      connectionPool.consecutiveErrors++;
      connectionPool.lastErrorTime = Date.now();
      
      console.error(`[Supabase][${traceId}] Health check failed with exception:`, {
        error: healthCheckError instanceof Error ? {
          name: healthCheckError.name,
          message: healthCheckError.message,
          stack: healthCheckError.stack?.split('\n')[0]
        } : String(healthCheckError),
        consecutiveErrors: connectionPool.consecutiveErrors,
        totalAttempts: connectionPool.totalConnections
      });
      
      // Treat any exception during health check as a connection error
      connectionPool.isConnected = false;
      throw healthCheckError;
    }
    
    // Health check passed - update connection metrics
    connectionPool.consecutiveErrors = 0; // Reset error counter on success
    connectionPool.successfulConnections++;
    
    // Update the connection pool with the new client
    connectionPool.client = supabase;
    connectionPool.lastUsed = now;
    connectionPool.isConnected = true;
    connectionPool.connectionRetries = 0;
    
    // Calculate success rate
    const successRate = connectionPool.successfulConnections / connectionPool.totalConnections;
    const successRatePercent = (successRate * 100).toFixed(2);
    
    console.log(`[Supabase][${traceId}] Connection established successfully. Stats: {
      successRate: ${successRatePercent}%,
      totalAttempts: ${connectionPool.totalConnections},
      successfulConnections: ${connectionPool.successfulConnections}
    }`);
    
    // Complete performance tracking
    metrics.duration = performance.now() - startTime;
    console.log(`[Supabase][${traceId}] Connection response time: ${metrics.duration.toFixed(2)}ms`, metrics);
    
    return supabase;
  } catch (error) {
    connectionPool.isConnected = false;
    
    // Complete performance tracking even for errors
    metrics.duration = performance.now() - startTime;
    
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error(`[Supabase][${traceId}] Failed to initialize client:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        duration: metrics.duration.toFixed(2),
        metrics
      });
    } else {
      console.error(`[Supabase][${traceId}] Failed to initialize client with unknown error:`, {
        error,
        duration: metrics.duration.toFixed(2),
        metrics
      });
    }
    throw error;
  }
} 