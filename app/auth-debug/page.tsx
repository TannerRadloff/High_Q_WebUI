'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthDebugPage() {
  const [redirectUri, setRedirectUri] = useState<string>('')
  const [appUrl, setAppUrl] = useState<string>('')
  const [provider, setProvider] = useState<string>('google')
  
  useEffect(() => {
    // Get the current origin for the redirect URL
    const currentRedirectUri = `${window.location.origin}/auth/callback`
    setRedirectUri(currentRedirectUri)
    
    // Get app URL from env
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'Not set'
    setAppUrl(envAppUrl)
  }, [])
  
  const testOAuthRedirect = async () => {
    try {
      const supabase = createClient()
      
      // This only prepares the redirect but doesn't actually redirect
      // It will show us what URL would be used
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      })
      
      if (error) {
        console.error('OAuth error:', error)
        return
      }
      
      // Display the URL without redirecting
      if (data.url) {
        document.getElementById('oauth-url')!.textContent = data.url
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }
  
  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">OAuth Debug Information</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Detected OAuth Redirect URI:</h2>
          <div className="p-2 bg-white dark:bg-gray-900 rounded mt-1 border border-gray-300 dark:border-gray-700">
            {redirectUri}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Make sure this exact URI is registered in your OAuth provider.
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">NEXT_PUBLIC_APP_URL Environment Variable:</h2>
          <div className="p-2 bg-white dark:bg-gray-900 rounded mt-1 border border-gray-300 dark:border-gray-700">
            {appUrl}
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Test OAuth Redirect Generation:</h2>
          <div className="flex gap-2 mb-2">
            <select 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="google">Google</option>
              <option value="github">GitHub</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
            </select>
            <button 
              onClick={testOAuthRedirect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Generate OAuth URL
            </button>
          </div>
          <div className="mt-2">
            <h3 className="font-medium">Generated OAuth URL:</h3>
            <div id="oauth-url" className="p-2 bg-white dark:bg-gray-900 rounded mt-1 border border-gray-300 dark:border-gray-700 text-sm break-all">
              Click the button above to generate a URL
            </div>
            <p className="text-sm text-gray-500 mt-1">
              This shows the exact URL that would be used for the OAuth redirect.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
        <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Debugging Steps:</h2>
        <ol className="list-decimal list-inside space-y-2 mt-2 text-yellow-700 dark:text-yellow-300">
          <li>Copy the exact redirect URI shown above</li>
          <li>Go to your OAuth provider (Google Cloud Console, GitHub, etc.)</li>
          <li>Make sure this exact URI is listed in the authorized redirect URIs</li>
          <li>Check for any differences in protocol (http vs https), trailing slashes, or subdomains</li>
          <li>Save your changes and wait a few minutes for them to propagate</li>
          <li>Try logging in again</li>
        </ol>
      </div>
    </div>
  )
} 