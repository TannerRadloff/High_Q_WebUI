import { NextResponse } from 'next/server';
import { checkRequiredEnvVars } from '@/lib/env-check';
import postgres from 'postgres';

/**
 * API route to check environment variables and database connection
 * 
 * This allows client components to verify if required environment variables
 * are set properly and if the database connection is working
 */
export async function GET() {
  try {
    // Check environment variables on server side
    const result = checkRequiredEnvVars();
    
    // Check database connection if POSTGRES_URL is set
    let dbStatus = {
      isConnected: false,
      error: null as string | null
    };
    
    if (process.env.POSTGRES_URL) {
      try {
        // Try to connect to the database
        const client = postgres(process.env.POSTGRES_URL, {
          max: 1, // Use only one connection for this check
          idle_timeout: 5, // Short timeout
          connect_timeout: 5, // Short connection timeout
        });

        // Test the connection with a simple query
        await client`SELECT 1`;
        
        // Close the connection
        await client.end();
        
        dbStatus.isConnected = true;
      } catch (dbError: any) {
        console.error('Database connection error:', dbError);
        dbStatus.error = dbError.code || 'Unknown database error';
      }
    } else {
      dbStatus.error = 'POSTGRES_URL environment variable is not set';
    }
    
    // Return only what the client needs to know, not the detailed messages
    // which might contain sensitive information
    return NextResponse.json({
      isValid: result.isValid,
      missingCount: result.missingVars.length,
      database: dbStatus
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json(
      {
        isValid: false,
        error: 'Failed to check environment variables',
        database: {
          isConnected: false,
          error: 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
} 