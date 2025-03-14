'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/src/components/auth/login-form'
import { useAuth } from '@/components/auth/auth-provider'
import { motion } from 'framer-motion'
import { ErrorMessage } from '@/src/components/ui/error-message'

interface EnvCheckResult {
  isValid: boolean;
  missingCount: number;
  database?: {
    isConnected: boolean;
    error: string | null;
  };
}

export default function LoginPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [envError, setEnvError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [isCheckingEnv, setIsCheckingEnv] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Environment check function
  const checkEnvironment = useCallback(async () => {
    try {
      setIsCheckingEnv(true)
      
      const response = await fetch('/api/check-env', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      // Check if we got a valid JSON response
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('[LoginPage] Non-JSON response from check-env API:', contentType)
        // Continue with login page without blocking for env errors
        setIsCheckingEnv(false)
        return
      }
      
      const data: EnvCheckResult = await response.json()
      
      if (!data.isValid) {
        setEnvError(`The application is misconfigured. Missing required environment variables. Please check the server logs for more details.`)
      }
      
      if (data.database && !data.database.isConnected) {
        setDbError(`Database connection error: ${data.database.error || 'Unknown error'}. Please check your database configuration.`)
      }
    } catch (error) {
      console.error('[LoginPage] Error checking environment:', error)
      // Don't block login due to env check failures
      // setEnvError('Failed to check environment configuration. Please try again later.')
    } finally {
      setIsCheckingEnv(false)
    }
  }, [])

  // Handle authentication and redirection
  useEffect(() => {
    // Try to check environment but don't block if it fails
    checkEnvironment().catch(() => {
      setIsCheckingEnv(false)
    })

    if (!isAuthLoading && user) {
      setIsRedirecting(true)
      // Add a small delay for a smoother transition
      const redirectTimeout = setTimeout(() => {
        // Only redirect if we're actually on the login page
        if (window.location.pathname.includes('/login')) {
          router.push('/')
        }
      }, 300)

      return () => clearTimeout(redirectTimeout)
    }
  }, [user, isAuthLoading, router, checkEnvironment])

  return (
    <div className="flex-center-col min-h-screen py-2 bg-gradient-to-b from-black via-slate-900 to-slate-950">
      {/* Loading state */}
      {(isAuthLoading || isCheckingEnv) && (
        <motion.div 
          key="loading"
          className="w-full max-w-md flex-center-col space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      )}
      
      {/* Redirect indicator */}
      {isRedirecting && (
        <motion.div 
          className="modal-overlay visible" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-background p-4 rounded-md shadow-xl">
            <div className="flex-row-center space-x-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Redirecting to dashboard...</p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Environment configuration error */}
      {!isAuthLoading && !isCheckingEnv && !isRedirecting && (envError || dbError) && (
        <motion.div 
          className="w-full mx-auto max-w-md space-y-6 rounded-xl bg-gradient-to-b from-zinc-900/70 to-zinc-800/90 p-8 shadow-2xl shadow-zinc-900/30 backdrop-blur-sm border border-zinc-800/80"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex-col-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-red-400">Configuration Error</h2>
            
            <div className="mt-4">
              {envError && (
                <ErrorMessage
                  type="server"
                  message={envError}
                  className="mb-3"
                />
              )}
              
              {dbError && (
                <ErrorMessage
                  type="server"
                  message={dbError}
                  className="mb-3"
                />
              )}
            </div>
            
            <p className="mt-4 text-sm text-zinc-400">
              Please check your environment configuration before continuing.
            </p>
          </div>
        </motion.div>
      )}

      {/* Login form for non-authenticated users */}
      {!isAuthLoading && !isCheckingEnv && !isRedirecting && !envError && !dbError && !user && (
        <LoginForm />
      )}
    </div>
  )
}


