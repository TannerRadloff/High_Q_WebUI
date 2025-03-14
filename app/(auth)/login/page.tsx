'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/src/components/auth/login-form'
import { useAuth } from '@/components/auth/auth-provider'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

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
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
      <div className="w-full max-w-md mb-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="flex items-center justify-center">
            <span className="text-5xl mb-2">✨</span>
          </Link>
          <h2 className="text-center text-3xl font-extrabold text-white">
            NextJS AI Chatbot
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Welcome back! Please sign in to your account
          </p>
        </motion.div>
      </div>

      {/* Loading state */}
      {(isAuthLoading || isCheckingEnv || isRedirecting) && (
        <motion.div 
          className="flex items-center justify-center min-h-[40vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
            <p className="mt-4 text-sm text-zinc-400">
              {isRedirecting 
                ? 'Redirecting to your dashboard...' 
                : 'Preparing your login...'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Error state */}
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
            
            {envError && (
              <motion.div 
                className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-md"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm text-red-400">
                  {envError}
                </p>
              </motion.div>
            )}
            
            {dbError && (
              <motion.div 
                className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-md"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-red-400">
                  {dbError}
                </p>
              </motion.div>
            )}
            
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


