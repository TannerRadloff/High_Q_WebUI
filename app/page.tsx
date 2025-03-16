'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Chat } from '@/app/features/chat/chat'
import HomeLayout from './home-layout'
import { BrainIcon } from '@/app/features/icons/icons'
import { Button } from '@/components/ui/button'
import { CrossIcon } from '@/app/features/icons/icons'

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

export default function Home() {
  const { user, isLoading, session } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [showAgentBanner, setShowAgentBanner] = useState(true)

  useEffect(() => {
    // Check if banner has been dismissed before
    const agentBannerDismissed = localStorage.getItem('agent-banner-dismissed')
    if (agentBannerDismissed === 'true') {
      setShowAgentBanner(false)
    }
  }, [])

  const handleDismissBanner = () => {
    setShowAgentBanner(false)
    localStorage.setItem('agent-banner-dismissed', 'true')
  }

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
        {showAgentBanner && <AgentWelcomeBanner onClose={handleDismissBanner} />}
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
        <Button 
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Go to Login
        </Button>
      </div>
    </div>
  )
} 