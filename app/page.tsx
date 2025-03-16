'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Chat } from '@/app/features/chat/chat'
import HomeLayout from './home-layout'
import { BrainIcon } from '@/app/features/icons/icons'
import { Button } from '@/components/ui/button'
import { CrossIcon } from '@/app/features/icons/icons'
import RecoveryLink from '../src/components/auth/recovery-link'
import { getAuthDebugInfo, fixInconsistentAuthState } from '../src/utils/auth-debug'

// Force client-side rendering to ensure authentication works correctly
export const dynamic = 'force-dynamic';

// Agent Welcome Banner Component
const AgentWelcomeBanner = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 h-6 w-6" 
        onClick={onClose}
      >
        <CrossIcon size={14} />
      </Button>
      <div className="flex items-start space-x-4">
        <div className="bg-primary/10 rounded-full p-2 mt-1">
          <BrainIcon size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-lg mb-1">Discover AI Agents</h3>
          <p className="text-muted-foreground mb-3">
            AI Agents can help you accomplish complex tasks by utilizing specialized capabilities.
            Each agent is designed for specific use cases such as research, report generation, and more.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => window.location.href = '/agent-dashboard'}
          >
            Explore Agent Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

// Error fallback component
const AuthErrorFallback = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <div className="text-center max-w-md p-6 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
        <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-400">Authentication Error</h2>
        <p className="text-muted-foreground mb-4">
          There was a problem verifying your authentication status. This could be due to a temporary issue or an expired session.
        </p>
        <div className="flex space-x-3 justify-center">
          <Button 
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/login?retry=true'}
            variant="outline"
            className="px-4 py-2 rounded-md"
          >
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user, isLoading, session, refreshSession } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [showAgentBanner, setShowAgentBanner] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [lastRedirectTime, setLastRedirectTime] = useState<number>(0)
  
  // Add state to track errors
  const [authError, setAuthError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isRecoveryAttempted, setIsRecoveryAttempted] = useState(false)
  const [authWarning, setAuthWarning] = useState(false)

  // Run client-side only code after mount
  useEffect(() => {
    setIsMounted(true)
    
    // Check if banner has been dismissed before - only on client
    try {
      // Check for inconsistent auth state and attempt to fix
      const wasFixed = fixInconsistentAuthState()
      if (wasFixed) {
        console.log('[HomePage] Fixed inconsistent auth state')
        // Record that we attempted recovery
        setIsRecoveryAttempted(true)
        // Show a warning that auth was fixed
        setAuthWarning(true)
      }
      
      const agentBannerDismissed = localStorage.getItem('agent-banner-dismissed')
      if (agentBannerDismissed !== 'true') {
        setShowAgentBanner(true)
      }
      
      // Recover last redirect time from sessionStorage
      const storedTime = sessionStorage.getItem('home_last_redirect')
      if (storedTime) {
        setLastRedirectTime(parseInt(storedTime, 10))
      }
      
      // Check for URL parameters indicating a retry after error
      const queryParams = new URLSearchParams(window.location.search)
      if (queryParams.has('retry') && queryParams.get('retry') === 'auth') {
        // Attempt to refresh the session automatically
        refreshSession().catch(err => {
          console.error('[HomePage] Session refresh error:', err)
          // Show auth warning if refresh fails
          setAuthWarning(true)
        })
      }
    } catch (e) {
      console.error('LocalStorage/SessionStorage error:', e)
      // Default to showing banner if localStorage fails
      setShowAgentBanner(true)
    }
  }, [refreshSession])

  const handleDismissBanner = () => {
    setShowAgentBanner(false)
    try {
      localStorage.setItem('agent-banner-dismissed', 'true')
    } catch (e) {
      console.error('LocalStorage error during banner dismiss:', e)
    }
  }
  
  // Handle retry after error
  const handleRetry = async () => {
    setRetryCount(prev => prev + 1)
    setAuthError(false)
    
    try {
      // Try to refresh the session
      await refreshSession()
      console.log('[HomePage] Session refreshed on retry')
      
      // Reset redirect counter when authentication succeeds
      try {
        sessionStorage.removeItem('homeRedirectCount')
        sessionStorage.removeItem('home_last_redirect')
      } catch (e) {
        console.error('SessionStorage error during counter reset:', e)
      }
    } catch (err) {
      console.error('[HomePage] Retry refresh failed:', err)
      
      // After multiple retries, force redirect to login
      if (retryCount >= 2) {
        window.location.href = '/login?from=home&retry=true'
      }
    }
  }

  useEffect(() => {
    // Only run auth check on client side after mount
    if (!isMounted) return
    
    if (!isLoading && !hasCheckedAuth) {
      console.log('[HomePage] Auth state loaded:', { 
        hasUser: !!user, 
        hasSession: !!session,
        sessionExpiry: session?.expires ? new Date(session.expires).toISOString() : 'N/A',
        retryCount
      })
      
      // Log full debug info for detailed diagnostics
      try {
        const debugInfo = getAuthDebugInfo()
        console.log('[HomePage] Auth debug info:', debugInfo)
      } catch (e) {
        console.error('[HomePage] Error getting debug info:', e)
      }
      
      setHasCheckedAuth(true)
      
      if (!user) {
        console.log('[HomePage] User not authenticated, redirecting to login')
        
        // Apply a cooldown to prevent redirect loops
        const now = Date.now()
        const cooldownPeriod = 2000 // 2 seconds
        
        if (now - lastRedirectTime > cooldownPeriod) {
          // Check if we're in a potential redirect loop
          let redirectCount = 0
          try {
            const storedCount = sessionStorage.getItem('homeRedirectCount')
            redirectCount = storedCount ? parseInt(storedCount, 10) : 0
          } catch (e) {
            console.error('SessionStorage error:', e)
          }
          
          // Only redirect if we're actually on the home page to prevent loops
          // and only if we're not already redirecting and haven't redirected too many times
          if (window.location.pathname === '/' && !isRedirecting && redirectCount < 3) {
            setIsRedirecting(true)
            setLastRedirectTime(now)
            
            // Store redirect time in sessionStorage
            try {
              sessionStorage.setItem('home_last_redirect', now.toString())
              sessionStorage.setItem('homeRedirectCount', (redirectCount + 1).toString())
            } catch (e) {
              console.error('SessionStorage error during redirect:', e)
            }
            
            console.log(`[HomePage] Redirecting to login (attempt ${redirectCount + 1})`)
            
            // Add a small delay to prevent rapid redirects
            setTimeout(() => {
              // Add a query param to help with loop detection
              router.replace('/login?from=home')
            }, 300)
          } else if (redirectCount >= 3) {
            console.log('[HomePage] Too many redirects, showing error state')
            // Set the error state instead of redirecting more
            setAuthError(true)
            
            // Reset counter and show an error state instead
            try {
              sessionStorage.removeItem('homeRedirectCount')
            } catch (e) {
              console.error('SessionStorage error during redirect count reset:', e)
            }
          }
        } else {
          console.log('[HomePage] Redirect prevented by cooldown period')
        }
      } else {
        console.log('[HomePage] User authenticated, staying on home page')
        // Reset redirect counter when authentication succeeds
        try {
          sessionStorage.removeItem('homeRedirectCount')
          sessionStorage.removeItem('home_last_redirect')
        } catch (e) {
          console.error('SessionStorage error during counter reset:', e)
        }
      }
    }
  }, [user, isLoading, router, session, hasCheckedAuth, isRedirecting, isMounted, lastRedirectTime, retryCount])

  // Show a simple loading state until client-side code can run
  if (!isMounted) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Loading...
          </p>
        </div>
      </div>
    )
  }
  
  // Show auth error state
  if (authError) {
    return <AuthErrorFallback onRetry={handleRetry} />
  }

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
        {showAgentBanner && <AgentWelcomeBanner onClose={handleDismissBanner} />}
        
        {authWarning && (
          <div className="mb-4">
            <RecoveryLink 
              mode="full" 
              onClose={() => setAuthWarning(false)}
            />
          </div>
        )}
        
        <Chat 
          id="create-new"
          initialMessages={[]}
          selectedChatModel="gpt-3.5-turbo"
          selectedVisibilityType="private"
          isReadonly={false}
        />
        
        {/* Always show minimal recovery link at bottom of page for easy access */}
        <div className="mt-6 text-center">
          <RecoveryLink mode="minimal" />
        </div>
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
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Login
          </Button>
          <Button
            onClick={handleRetry}
            variant="outline"
            className="w-full px-4 py-2 rounded-md"
          >
            Retry Authentication Check
          </Button>
        </div>
      </div>
    </div>
  )
} 