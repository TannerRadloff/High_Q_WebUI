'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/components/auth/auth-provider'

interface EnvCheckResult {
  isValid: boolean;
  missingCount: number;
  database?: {
    isConnected: boolean;
    error: string | null;
  };
}

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [envError, setEnvError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [isCheckingEnv, setIsCheckingEnv] = useState(true)

  useEffect(() => {
    // Check for environment configuration issues through API
    setIsCheckingEnv(true);
    fetch('/api/check-env')
      .then(response => response.json())
      .then((data: EnvCheckResult) => {
        if (!data.isValid) {
          const errorMessage = `The application is misconfigured. Missing required environment variables. Please check the server logs for more details.`;
          console.error('[LoginPage] Environment configuration error:', errorMessage);
          setEnvError(errorMessage);
        }
        
        // Check database connection status
        if (data.database && !data.database.isConnected) {
          const dbErrorMsg = `Database connection error: ${data.database.error || 'Unknown error'}. Please check your database configuration.`;
          console.error('[LoginPage] Database connection error:', dbErrorMsg);
          setDbError(dbErrorMsg);
        }
      })
      .catch(error => {
        console.error('[LoginPage] Error checking environment configuration:', error);
        setEnvError('Failed to check environment configuration. Please try again later.');
      })
      .finally(() => {
        setIsCheckingEnv(false);
      });

    if (!isLoading) {
      console.log('[LoginPage] Auth state loaded:', { hasUser: !!user })
      
      if (user) {
        console.log('[LoginPage] User is authenticated, redirecting to home')
        // Safe redirect - only redirect if we're actually on the login page
        // This prevents redirect loops
        if (window.location.pathname.includes('/login')) {
          // Use router.push instead of window.location for a smoother experience
          router.push('/')
        } else {
          console.log('[LoginPage] Already at home, not redirecting')
        }
      }
    }
  }, [user, isLoading, router])

  // Show loading state while checking auth or environment
  if (isLoading || isCheckingEnv) {
    console.log('[LoginPage] Loading auth state or checking environment...')
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show environment error if there is one
  if (envError || dbError) {
    return (
      <div className="w-full mx-auto max-w-md space-y-6 rounded-xl bg-gradient-to-b from-zinc-50/70 to-white/90 p-8 shadow-2xl shadow-red-500/10 dark:from-zinc-900/70 dark:to-zinc-800/90 dark:shadow-zinc-900/30 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex flex-col text-center">
          <h2 className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">Configuration Error</h2>
          
          {envError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                {envError}
              </p>
            </div>
          )}
          
          {dbError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                {dbError}
              </p>
            </div>
          )}
          
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Please check your environment configuration before continuing.
          </p>
        </div>
      </div>
    )
  }

  // Only show login form if user is not authenticated
  if (!user) {
    console.log('[LoginPage] User not authenticated, showing login form')
    return <LoginForm />
  }

  // If we're authenticated but not on the login page, render nothing
  // This prevents unnecessary redirects
  console.log('[LoginPage] User authenticated but not on login page')
  return null
}


