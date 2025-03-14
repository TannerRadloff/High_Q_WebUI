'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const { user, session, isLoading } = useAuth()
  const [apiData, setApiData] = useState<any>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoadingApi, setIsLoadingApi] = useState(false)
  const [browserCookies, setBrowserCookies] = useState<string[]>([])
  
  // Get browser cookies
  useEffect(() => {
    const cookies = document.cookie.split(';').map(c => c.trim())
    setBrowserCookies(cookies)
  }, [])
  
  // Fetch debug API data
  const fetchDebugData = async () => {
    setIsLoadingApi(true)
    setApiError(null)
    
    try {
      const response = await fetch('/api/debug-auth')
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      setApiData(data)
    } catch (error) {
      console.error('Debug API error:', error)
      setApiError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoadingApi(false)
    }
  }
  
  // Initialize Supabase client for testing
  const testSupabaseClient = () => {
    try {
      const supabase = createClient()
      return supabase.auth.getSession()
    } catch (error) {
      console.error('Supabase client error:', error)
      return { error }
    }
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Provider State */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Auth Provider State</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
            {user && (
              <>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
              </>
            )}
            {session && (
              <>
                <p><strong>Session Expires:</strong> {session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'Unknown'}</p>
                <p><strong>Current Time:</strong> {new Date().toISOString()}</p>
              </>
            )}
          </div>
        </div>
        
        {/* Browser Cookies */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Browser Cookies</h2>
          {browserCookies.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {browserCookies
                .filter(c => c.startsWith('sb-') || c.includes('supabase') || c.includes('auth'))
                .map((cookie, i) => (
                  <li key={i} className="font-mono">{cookie}</li>
                ))}
            </ul>
          ) : (
            <p>No auth-related cookies found</p>
          )}
        </div>
        
        {/* Server API Data */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow md:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Server Auth Check</h2>
            <button 
              onClick={fetchDebugData}
              disabled={isLoadingApi}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoadingApi ? 'Loading...' : 'Check Server Auth'}
            </button>
          </div>
          
          {apiError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {apiError}
            </div>
          )}
          
          {apiData && (
            <div className="overflow-auto max-h-96">
              <pre className="text-xs">{JSON.stringify(apiData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Troubleshooting Actions</h2>
        <div className="space-y-3">
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-3"
          >
            Go to Home Page
          </button>
          
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-3"
          >
            Go to Login Page
          </button>
          
          <button 
            onClick={() => {
              document.cookie.split(';').forEach(c => {
                const name = c.trim().split('=')[0]
                if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
                }
              })
              window.location.reload()
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Auth Cookies
          </button>
        </div>
      </div>
    </div>
  )
} 