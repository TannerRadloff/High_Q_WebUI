import { NextResponse } from 'next/server';
import postgres from 'postgres';

/**
 * API route to check database connection
 * 
 * This allows client components to verify if the database connection
 * is working properly without directly accessing process.env
 */
export async function GET() {
  try {
    // Check if POSTGRES_URL is set
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json(
        {
          isConnected: false,
          error: 'POSTGRES_URL environment variable is not set',
        },
        { status: 500 }
      );
    }

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
    
    return NextResponse.json({
      isConnected: true,
      message: 'Database connection successful',
    });
  } catch (error: any) {
    console.error('Error checking database connection:', error);
    
    // Return specific error information
    return NextResponse.json(
      {
        isConnected: false,
        error: error.message || 'Unknown database error',
        code: error.code || 'UNKNOWN',
      },
      { status: 500 }
    );
  }
} 