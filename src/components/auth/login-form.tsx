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
import { ErrorMessage } from '@/src/components/ui/error-message'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { z } from 'zod'
import { getOAuthRedirectUrl } from '@/lib/helpers/url'

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

// Error fallback component for the login form
function FormErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-zinc-900/90 rounded-lg border border-red-500/30 shadow-xl">
      <h2 className="text-xl text-red-400 font-semibold mb-4">Authentication Error</h2>
      <p className="text-white/80 mb-4">
        There was a problem with the authentication system. Please try again later.
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

export function LoginForm() {
  return (
    <ErrorBoundary
      FallbackComponent={FormErrorFallback}
      onReset={() => {
        // Reset the state when trying again
        window.location.reload();
      }}
    >
      <LoginFormContent />
    </ErrorBoundary>
  );
}

function LoginFormContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const { signIn } = useAuth()
  
  // Create the Supabase client with error handling
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null)
  
  useEffect(() => {
    try {
      const client = createClient()
      setSupabase(client)
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error)
      setClientError('Could not initialize authentication client. Please check your configuration.')
    }
  }, [])

  // Debug function to check environment variables - disabled to avoid redirect issues
  // useEffect(() => {
  //   const checkEnv = async () => {
  //     try {
  //       // Add a cache-busting parameter
  //       const cacheBuster = new Date().getTime();
  //       const response = await fetch(`/api/check-env?t=${cacheBuster}`, {
  //         headers: {
  //           'Cache-Control': 'no-cache, no-store, must-revalidate',
  //           'Pragma': 'no-cache',
  //           'Expires': '0'
  //         }
  //       });
  //       
  //       if (!response.ok) {
  //         console.error('Environment check API returned error:', response.status);
  //         return;
  //       }
  //       
  //       // Check if we received JSON
  //       const contentType = response.headers.get('content-type');
  //       if (!contentType || !contentType.includes('application/json')) {
  //         console.warn('Non-JSON response from check-env API:', contentType);
  //         return;
  //       }
  //       
  //       // Safely parse the response
  //       const text = await response.text();
  //       let data: EnvCheckResult;
  //       
  //       try {
  //         data = JSON.parse(text);
  //       } catch (jsonError) {
  //         console.error('Failed to parse JSON response:', text.substring(0, 100));
  //         return;
  //       }
  //       
  //       if (!data.isValid) {
  //         setApiKeyError(`Missing required environment variables. Please check your .env file.`);
  //       }
  //       
  //       if (data.database && !data.database.isConnected) {
  //         setDbError(`Database connection error: ${data.database.error || 'Unknown error'}. Please check your database configuration.`);
  //       }
  //     } catch (error) {
  //       console.error('Error checking environment:', error);
  //     }
  //   };
  //   
  //   checkEnv();
  // }, []);

  const showErrorNotification = (message: string) => {
    toast.error(message, {
      id: 'login-error',
      duration: 5000,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      showErrorNotification('Please enter both email and password')
      return
    }
    
    if (!supabase) {
      showErrorNotification('Authentication system is not ready. Please reload the page.')
      return
    }
    
    setIsLoading(true)
    
    try {
      await signIn(email, password)
      // Add a manual redirect as a fallback
      setTimeout(() => {
        console.log('Login form fallback redirect to home')
        // Use direct location change instead of router
        window.location.href = '/'
        // Comment out router usage which might be causing issues
        // router.push('/')
        // router.refresh()
      }, 1000)
    } catch (error: any) {
      showErrorNotification(error.message || 'Failed to sign in')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      showErrorNotification('Authentication system is not ready. Please reload the page.')
      return
    }
    
    setIsGoogleLoading(true)
    
    try {
      // Use the helper function to get a consistent redirect URL
      const redirectUrl = getOAuthRedirectUrl();
      console.log('[Login] Using OAuth redirect URL:', redirectUrl);
      
      // Use Supabase OAuth with Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })
      
      if (error) {
        throw error
      }
      
      // If not redirected, handle it
      if (!data.url) {
        throw new Error('Failed to initiate Google sign in')
      }
      
      // We'll be redirected, so no need to handle success here
    } catch (error: any) {
      showErrorNotification(error.message || 'Failed to sign in with Google')
      setIsGoogleLoading(false)
    }
  }

  // Add a test function for navigation
  const testNavigation = () => {
    console.log('Testing navigation to /profile')
    router.push('/profile')
  }

  // If there are API key or DB configuration errors, show special message
  if (apiKeyError || dbError || clientError) {
    return (
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
            {apiKeyError && (
              <ErrorMessage
                type="server"
                message={apiKeyError}
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
            
            {clientError && (
              <ErrorMessage
                type="server"
                message={clientError}
                className="mb-3"
              />
            )}
          </div>
          
          <p className="mt-4 text-sm text-zinc-400">
            Please check your environment configuration before continuing.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="w-full mx-auto max-w-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mx-auto max-w-sm shadow-xl border-zinc-800/60 bg-gradient-to-b from-zinc-900/70 to-zinc-800/90 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center items-center mb-2">
            <LockIcon size={40} />
          </div>
          <CardTitle className="text-2xl text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/90 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2">Signing in</span>
                        <span className="animate-spin">⟳</span>
                      </>
                    ) : 'Sign In'}
                  </Button>
                  
                  {/* Test button */}
                  <Button type="button" variant="outline" onClick={testNavigation} className="w-full">
                    Test Navigation
                  </Button>
                </div>
              </form>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                'Connecting...'
              ) : (
                <>
                  <FcGoogle className="mr-2 h-4 w-4" />
                  Google
                </>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm text-muted-foreground mt-2">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
} 