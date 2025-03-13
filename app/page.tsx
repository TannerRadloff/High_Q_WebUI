'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Chat } from '@/components/chat'
import type { VisibilityType } from '@/components/visibility-selector'

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      console.log('[HomePage] Auth state loaded:', { hasUser: !!user })
      
      if (!user) {
        console.log('[HomePage] User not authenticated, redirecting to login')
        // Only redirect if we're actually on the home page to prevent loops
        if (window.location.pathname === '/') {
          router.push('/login')
        }
      } else {
        // Redirect authenticated users to the chat-home route
        // This helps avoid issues with the (chat) route group
        console.log('[HomePage] User authenticated, redirecting to chat-home')
        router.push('/chat-home')
      }
    }
  }, [user, isLoading, router])

  // Show loading state while checking auth
  if (isLoading) {
    console.log('[HomePage] Loading auth state...')
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Return null while redirecting to prevent flash of content
  console.log('[HomePage] Redirecting, rendering nothing')
  return null
} 