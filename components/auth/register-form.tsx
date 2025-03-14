'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { FcGoogle } from 'react-icons/fc'

import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import { LogoGoogle } from '@/components/icons'

import { createClient } from '@/lib/supabase/client'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!username.trim()) {
      toast.error('Username is required')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: username,
            full_name: username
          }
        },
      })

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('This email is already registered. Please log in instead.')
        } else {
          toast.error(error.message)
        }
        console.error(error)
        return
      }

      toast.success('Check your email for the confirmation link!')
      // No redirect here as the user needs to verify their email
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.')
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    try {
      setIsGoogleLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error('Failed to register with Google. Please try again.')
        console.error('Google registration error:', error)
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
      console.error('Unexpected error during Google registration:', error)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
        <h3 className="text-xl font-semibold dark:text-zinc-50">Create an account</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Sign up to start chatting
        </p>
      </div>

      <form onSubmit={handleEmailRegister} className="flex flex-col gap-4 px-4 sm:px-16">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="username"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-muted text-md md:text-sm"
          />
        </div>

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
          <Label
            htmlFor="password"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-muted text-md md:text-sm"
            minLength={8}
          />
        </div>

        <Button type="submit" disabled={isLoading} className="mt-1">
          {isLoading ? 'Creating account...' : 'Sign up'}
        </Button>

        <div className="text-center text-sm text-gray-600 mt-2 dark:text-zinc-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
          >
            Sign in
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
          type="button"
          disabled={isLoading || isGoogleLoading}
          onClick={handleGoogleRegister}
          className="mt-6 w-full flex items-center justify-center gap-2"
        >
          <FcGoogle className="h-5 w-5" />
          {isGoogleLoading ? 'Connecting to Google...' : 'Google'}
        </Button>
      </div>
    </div>
  )
} 