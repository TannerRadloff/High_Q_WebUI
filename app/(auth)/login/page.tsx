'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/src/components/auth/login-form'
import { useAuth } from '@/components/auth/auth-provider'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
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
      const response = await fetch('/api/check-env')
      const data: EnvCheckResult = await response.json()
      
      if (!data.isValid) {
        setEnvError(`The application is misconfigured. Missing required environment variables. Please check the server logs for more details.`)
      }
      
      if (data.database && !data.database.isConnected) {
        setDbError(`Database connection error: ${data.database.error || 'Unknown error'}. Please check your database configuration.`)
      }
    } catch (error) {
      console.error('[LoginPage] Error checking environment:', error)
      setEnvError('Failed to check environment configuration. Please try again later.')
    } finally {
      setIsCheckingEnv(false)
    }
  }, [])

  // Handle authentication and redirection
  useEffect(() => {
    checkEnvironment()

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
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gradient-to-b from-black via-slate-900 to-slate-950">
      {/* Background animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black opacity-80"></div>
        <div className="cosmic-animation-container"></div>
      </div>
      
      {/* Loading state */}
      {(isAuthLoading || isCheckingEnv) && (
        <motion.div 
          key="loading"
          className="w-full max-w-md flex flex-col items-center justify-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Checking environment...</p>
        </motion.div>
      )}
      
      {/* Redirect indicator */}
      {isRedirecting && (
        <motion.div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-background p-4 rounded-md shadow-xl">
            <div className="flex items-center space-x-2">
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
          <div className="flex flex-col text-center">
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


