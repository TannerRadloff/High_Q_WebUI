'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Chat } from '@/src/components/features/chat'
import HomeLayout from './home-layout'

export default function Home() {
  const { user, isLoading, session } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      console.log('[HomePage] Auth state loaded:', { 
        hasUser: !!user, 
        hasSession: !!session,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
      })
      
      setHasCheckedAuth(true)
      
      if (!user) {
        console.log('[HomePage] User not authenticated, redirecting to login')
        
        // Check if we're in a potential redirect loop
        const redirectCount = sessionStorage.getItem('homeRedirectCount') || '0';
        const count = parseInt(redirectCount, 10);
        
        // Only redirect if we're actually on the home page to prevent loops
        // and only if we're not already redirecting and haven't redirected too many times
        if (window.location.pathname === '/' && !isRedirecting && count < 3) {
          setIsRedirecting(true)
          
          // Increment redirect count
          sessionStorage.setItem('homeRedirectCount', (count + 1).toString());
          console.log(`[HomePage] Redirecting to login (attempt ${count + 1})`);
          
          // Add a small delay to prevent rapid redirects
          setTimeout(() => {
            // Add a query param to help with loop detection
            router.push('/login?from=home')
          }, 300)
        } else if (count >= 3) {
          console.log('[HomePage] Too many redirects, stopping redirect loop');
          // Reset counter and show an error state instead
          sessionStorage.removeItem('homeRedirectCount');
        }
      } else {
        console.log('[HomePage] User authenticated, staying on home page')
        // Reset redirect counter when authentication succeeds
        sessionStorage.removeItem('homeRedirectCount');
      }
    }
  }, [user, isLoading, router, session, hasCheckedAuth, isRedirecting])

  // Show loading state while checking auth
  if (isLoading || isRedirecting) {
    console.log('[HomePage] Loading state:', { isLoading, isRedirecting })
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {isRedirecting ? 'Redirecting to login...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show chat UI only if user is authenticated
  if (user) {
    console.log('[HomePage] User authenticated, showing chat UI')
    return (
      <HomeLayout>
        <Chat 
          id="create-new"
          initialMessages={[]}
          selectedChatModel="gpt-3.5-turbo"
          selectedVisibilityType="private"
          isReadonly={false}
        />
      </HomeLayout>
    )
  }

  // Return a message if we somehow get here without redirecting
  console.log('[HomePage] Not authenticated but not redirecting - showing error state')
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <div className="text-center max-w-md p-6">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-4">
          You need to be logged in to access this page. Please sign in to continue.
        </p>
        <button 
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
} 