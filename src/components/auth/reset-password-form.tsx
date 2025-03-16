'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

import { Button } from '@/app/features/button/button'
import { Input } from '@/app/features/input/input'
import { Label } from '@/app/features/label/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/features/card/card'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const supabase = createClient()

  // Verify token is present in URL
  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      toast.error(errorDescription || 'Invalid or expired reset token')
      // Stay on page to allow users to request a new reset link
    }

    if (!token && !error) {
      toast.warning('No reset token found. Please request a new password reset link.')
      // Stay on page to allow users to request a new reset link
    }
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({ 
        password
      })
      
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully')
        // Wait briefly for the toast to be visible
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Reset password error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter a new password for your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
          <div className="text-center text-sm">
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
} 