'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { FcGoogle } from 'react-icons/fc'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { LockIcon } from '@/src/components/common/icons'

import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input' 
import { Label } from '@/src/components/ui/label'
import { Separator } from '@/src/components/ui/separator'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card'

interface EnvCheckResult {
  isValid: boolean;
  missingCount: number;
  database?: {
    isConnected: boolean;
    error: string | null;
  };
}

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const { signIn } = useAuth()
  const supabase = createClient()

  // Debug function to check environment variables
  useEffect(() => {
    // Check for OpenAI API key and database through the API
    fetch('/api/check-env')
      .then(response => {
        if (!response.ok) {
          throw new Error('API key validation failed');
        }
        return response.json();
      })
      .then((data: EnvCheckResult) => {
        if (!data.isValid) {
          setApiKeyError('The application is missing an OpenAI API key. Please add a valid API key to your .env.local file.');
        }
        
        // Check database connection status
        if (data.database && !data.database.isConnected) {
          setDbError(`Database connection error: ${data.database.error || 'Unknown error'}. Please check your database configuration.`);
        }
      })
      .catch(error => {
        console.error('Error checking environment:', error);
      });
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent login attempt if API key is missing
    if (apiKeyError) {
      toast.error(apiKeyError)
      return
    }
    
    // Prevent login attempt if database connection is failing
    if (dbError) {
      toast.error(dbError)
      return
    }
    
    setIsLoading(true)

    try {
      await signIn(email, password)
      toast.success('Logged in successfully!')
      router.push('/')
    } catch (error) {
      console.error('Login error:', error)
      // Error is handled by the signIn method in AuthProvider
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    // Prevent login attempt if API key is missing
    if (apiKeyError) {
      toast.error(apiKeyError)
      return
    }
    
    // Prevent login attempt if database connection is failing
    if (dbError) {
      toast.error(dbError)
      return
    }
    
    try {
      setIsGoogleLoading(true)
      
      // Get the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}/auth/callback`
      
      // Start the OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      })

      if (error) {
        console.error('Google OAuth error:', error)
        toast.error(`Failed to login with Google: ${error.message}`)
        return
      }

      if (!data.url) {
        console.error('Missing OAuth URL from Supabase response')
        toast.error('Failed to get authorization URL. Please try again.')
        return
      }

      // Add a slight delay before redirecting
      setTimeout(() => {
        window.location.href = data.url
      }, 100)
      
    } catch (error: any) {
      console.error('Unexpected Google login error:', error)
      toast.error(`Error: ${error?.message || 'An unexpected error occurred'}`)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: custom * 0.1, duration: 0.3 }
    })
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={formVariants}
      className="w-full mx-auto max-w-md"
    >
      <Card className="w-full backdrop-blur-sm border border-zinc-800/80 bg-zinc-900/80 shadow-xl">
        {(apiKeyError || dbError) && (
          <motion.div 
            className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
            variants={itemVariants}
            custom={0}
          >
            <div className="flex gap-2 text-red-600 dark:text-red-400">
              <span className="h-5 w-5 flex-shrink-0">⚠️</span>
              <div className="text-sm">
                {apiKeyError || dbError}
              </div>
            </div>
          </motion.div>
        )}

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div className="space-y-2" variants={itemVariants} custom={1}>
              <Label
                htmlFor="email"
                className="text-sm font-medium text-zinc-300"
              >
                Email
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <span className="h-4 w-4">✉️</span>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-zinc-800/50 border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants} custom={2}>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-300"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <LockIcon />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-zinc-800/50 border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} custom={3}>
              <Button 
                type="submit" 
                disabled={isLoading || !!apiKeyError || !!dbError}
                className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <span className="h-4 w-4">→</span>
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          <motion.div 
            className="relative my-6" 
            variants={itemVariants} 
            custom={4}
          >
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-zinc-900 px-2 text-xs text-zinc-400">
                Or continue with
              </span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} custom={5}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || !!apiKeyError || !!dbError}
              className="w-full border-zinc-700 text-zinc-300 flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-zinc-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <FcGoogle className="h-5 w-5" />
                  <span>Sign in with Google</span>
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <motion.p 
            className="text-sm text-zinc-400"
            variants={itemVariants}
            custom={6}
          >
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Create an account
            </Link>
          </motion.p>
        </CardFooter>
      </Card>
    </motion.div>
  )
} 