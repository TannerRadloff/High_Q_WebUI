'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { supabase } from '@/lib/supabase'

export function ForgotPasswordForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setIsSubmitted(true)
      toast.success('Check your email for the password reset link')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Check your email</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            We have sent a password reset link to your email.
          </p>
        </div>
        <div className="flex flex-col gap-4 px-4 sm:px-16">
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="mt-1"
          >
            Back to login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
        <h3 className="text-xl font-semibold dark:text-zinc-50">Forgot your password?</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Enter your email and we'll send you a reset link
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

        <Button type="submit" disabled={isLoading} className="mt-1">
          {isLoading ? 'Sending reset link...' : 'Send reset link'}
        </Button>

        <div className="text-center text-sm text-gray-600 mt-2 dark:text-zinc-400">
          Remember your password?{' '}
          <Link
            href="/login"
            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
} 