'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import React from 'react'
import { FcGoogle } from 'react-icons/fc'
import { LockClosedIcon, EnvelopeIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input' 
import { Label } from '@/components/ui/label'

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
    console.log('Login form initialized')
    
    // For client-side components, we don't directly check for process.env variables 
    // that aren't prefixed with NEXT_PUBLIC_ as they're not accessible
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Instead of checking process.env.OPENAI_API_KEY, we let server components
    // do validation and pass the result to client
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
        // If there's an error checking, we don't know if the API key is missing or not
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
    console.log('Google login button clicked')
    
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
      console.log('Redirect URL:', redirectUrl)
      
      // Show the redirect URL in the UI (temporary) - you can remove this after debugging
      toast.info(`OAuth Redirect URL: ${redirectUrl}`, { duration: 10000 })
      
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

      // Log the URL we're redirecting to
      console.log('Redirecting to OAuth URL:', data.url)
      
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

  return (
    <div className="w-full mx-auto max-w-md space-y-6 rounded-xl bg-gradient-to-b from-zinc-50/70 to-white/90 p-8 shadow-2xl shadow-blue-500/10 dark:from-zinc-900/70 dark:to-zinc-800/90 dark:shadow-zinc-900/30 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800/80">
      <div className="flex flex-col text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Welcome Back</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your credentials to access your account
        </p>
      </div>

      {apiKeyError && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">
            {apiKeyError}
          </p>
        </div>
      )}

      {dbError && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">
            {dbError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </Label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 bg-white dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockClosedIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 bg-white dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !!apiKeyError || !!dbError}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition duration-150 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 size-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing In...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              Sign In <ArrowRightIcon className="ml-2 size-4" />
            </span>
          )}
        </Button>
      </form>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gradient-to-b from-zinc-50/70 to-white/90 dark:from-zinc-900/70 dark:to-zinc-800/90 px-3 text-zinc-500 dark:text-zinc-400">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || !!apiKeyError || !!dbError}
        className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 py-2.5 rounded-lg transition duration-150 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
      >
        {isGoogleLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 size-4 text-zinc-800 dark:text-zinc-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <FcGoogle className="mr-2 size-4" />
            Sign in with Google
          </span>
        )}
      </Button>

      <div className="text-center mt-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
} 