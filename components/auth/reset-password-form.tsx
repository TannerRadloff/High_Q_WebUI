'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'

import { supabase } from '@/lib/supabase'

export function ResetPasswordForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isResetComplete, setIsResetComplete] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setIsResetComplete(true)
      toast.success('Password has been reset successfully')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isResetComplete) {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Password Reset Complete</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
        </div>
        <div className="flex flex-col gap-4 px-4 sm:px-16">
          <Button
            onClick={() => router.push('/login')}
            className="mt-1"
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
        <h3 className="text-xl font-semibold dark:text-zinc-50">Reset Your Password</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            New Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="bg-muted text-md md:text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="confirmPassword"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="bg-muted text-md md:text-sm"
          />
        </div>

        <Button type="submit" disabled={isLoading} className="mt-1">
          {isLoading ? 'Resetting Password...' : 'Reset Password'}
        </Button>

        <div className="text-center text-sm text-gray-600 mt-2 dark:text-zinc-400">
          <Link
            href="/login"
            className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  )
} 