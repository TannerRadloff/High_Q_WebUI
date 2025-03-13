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
        // Force a hard navigation to the home page
        window.location.href = '/'
      }
    }
  }, [user, isLoading])

  // Show loading state while checking auth
  if (isLoading) {
    console.log('[LoginPage] Loading auth state...')
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
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
    return (
      <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
        <LoginForm />
      </div>
    )
  }

  // This return is technically not needed since we redirect in useEffect,
  // but it's good practice to always have a return
  return null
}


