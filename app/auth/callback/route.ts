import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handleOAuthCallback } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Simple callback handler that redirects users back to the home page
// after they authenticate with an OAuth provider
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    await handleOAuthCallback(code)
  }

  // Redirect to the home page after authentication
  return NextResponse.redirect(requestUrl.origin)
} 