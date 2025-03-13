import { NextResponse } from 'next/server';
import { checkRequiredEnvVars } from '@/lib/env-check';

/**
 * API route to check environment variables
 * 
 * This allows client components to verify if required environment variables
 * are set properly without directly accessing process.env
 */
export async function GET() {
  try {
    // Check environment variables on server side
    const result = checkRequiredEnvVars();
    
    // Return only what the client needs to know, not the detailed messages
    // which might contain sensitive information
    return NextResponse.json({
      isValid: result.isValid,
      missingCount: result.missingVars.length,
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json(
      {
        isValid: false,
        error: 'Failed to check environment variables',
      },
      { status: 500 }
    );
  }
} 