'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import React from 'react'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input' 
import { Label } from '@/components/ui/label'
import { LogoGoogle } from '@/components/icons'

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn } = useAuth()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signIn(email, password)
      toast.success('Logged in successfully!')
      router.push('/')
    } catch (error) {
      // Error is handled by the signIn method in AuthProvider
      // No need to show another toast here
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error('Failed to login with Google. Please try again.')
        console.error('Google login error:', error)
        setIsGoogleLoading(false)
        return
      }

      if (!data.url) {
        toast.error('Failed to get authorization URL. Please try again.')
        setIsGoogleLoading(false)
        return
      }

      // Redirect the user to the OAuth provider
      window.location.href = data.url
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.')
      console.error('Unexpected error during Google login:', error)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
        <h3 className="text-xl font-semibold dark:text-zinc-50">Welcome back</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="email"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="hello@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-muted text-md md:text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm text-gray-500 hover:underline dark:text-zinc-500"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-muted text-md md:text-sm"
          />
        </div>

        <Button type="submit" disabled={isLoading} className="mt-1">
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        <div className="text-center text-sm text-gray-600 mt-2 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
          >
            Sign up
          </Link>
        </div>
      </form>

      <div className="px-4 sm:px-16">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-gray-500 dark:text-zinc-400">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-6 w-full flex items-center justify-center gap-2"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
        >
          <FcGoogle className="h-5 w-5" />
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Google'}</span>
        </Button>
      </div>
    </div>
  )
} 