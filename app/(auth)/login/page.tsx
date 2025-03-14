'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/src/components/auth/login-form'
import { useAuth } from '@/components/auth/auth-provider'
import { motion } from 'framer-motion'
import { ErrorMessage } from '@/src/components/ui/error-message'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'

interface EnvCheckResult {
  isValid: boolean;
  missingCount: number;
  database?: {
    isConnected: boolean;
    error: string | null;
  };
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-zinc-900/90 rounded-lg border border-red-500/30 shadow-xl">
      <h2 className="text-xl text-red-400 font-semibold mb-4">Something went wrong</h2>
      <p className="text-white/80 mb-4">
        There was an error loading the login page. Please try again.
      </p>
      <pre className="bg-black/50 p-3 rounded text-xs text-red-300 mb-4 overflow-auto max-h-[150px]">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state when trying again
        window.location.reload();
      }}
    >
      <LoginPage />
    </ErrorBoundary>
  );
}

function LoginPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const [envError, setEnvError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [isCheckingEnv, setIsCheckingEnv] = useState(false) // Start with false to improve loading experience
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Environment check function - simplified to avoid blocking login
  const checkEnvironment = useCallback(async () => {
    try {
      // Skip environment check in deployed environment to avoid redirect issues
      // Only set checking to true briefly to prevent flashing
      setIsCheckingEnv(true)
      setTimeout(() => setIsCheckingEnv(false), 500)
      
      // We're intentionally not checking the environment anymore as it's causing
      // redirect issues in the deployed environment
    } catch (error) {
      console.error('[LoginPage] Error checking environment:', error)
    } finally {
      setIsCheckingEnv(false)
    }
  }, [])

  // Handle authentication and redirection
  useEffect(() => {
    // Wrap in try/catch to prevent unhandled errors
    try {
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
    } catch (error) {
      console.error('[LoginPage] Unhandled error in effect:', error)
      setIsCheckingEnv(false)
    }
  }, [user, isAuthLoading, router, checkEnvironment])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gradient-to-b from-black via-slate-900 to-slate-950">
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
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      )}
      
      {/* Redirect indicator */}
      {isRedirecting && (
        <motion.div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-background p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg">Redirecting to dashboard...</p>
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
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight text-red-400">Configuration Error</h2>
            
            <div className="mt-4 w-full">
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


