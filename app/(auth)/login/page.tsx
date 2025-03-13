'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/components/auth/auth-provider'

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      console.log('[LoginPage] Auth state loaded:', { hasUser: !!user })
      
      if (user) {
        console.log('[LoginPage] User is authenticated, redirecting to home')
        // Safe redirect - only redirect if we're actually on the login page
        // This prevents redirect loops
        if (window.location.pathname.includes('/login')) {
          // Use router.push instead of window.location for a smoother experience
          router.push('/')
        } else {
          console.log('[LoginPage] Already at home, not redirecting')
        }
      }
    }
  }, [user, isLoading, router])

  // Show loading state while checking auth
  if (isLoading) {
    console.log('[LoginPage] Loading auth state...')
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show login form if user is not authenticated
  if (!user) {
    console.log('[LoginPage] User not authenticated, showing login form')
    return <LoginForm />
  }

  // If we're authenticated but not on the login page, render nothing
  // This prevents unnecessary redirects
  console.log('[LoginPage] User authenticated but not on login page')
  return null
}


