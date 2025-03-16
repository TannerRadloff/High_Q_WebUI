'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to check if we're on an auth page
function isAuthPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.includes('/login') || 
         pathname.includes('/register') || 
         pathname.includes('/signup') || 
         pathname.includes('/forgot-password') ||
         pathname.includes('/reset-password');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasEnvError, setHasEnvError] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  // Track if we've already initialized
  const [hasInitialized, setHasInitialized] = useState(false)
  // Track last redirect time to prevent redirect loops
  const [lastRedirectTime, setLastRedirectTime] = useState<number>(0)
  
  // Safe redirect function with cooldown to prevent loops
  const safeRedirectWithCooldown = useCallback((path: string, replace: boolean = false) => {
    const now = Date.now()
    const cooldownPeriod = 2000 // 2 seconds cooldown
    
    // Only redirect if we haven't redirected recently
    if (now - lastRedirectTime > cooldownPeriod) {
      setLastRedirectTime(now)
      
      // Store the last redirect in sessionStorage
      try {
        sessionStorage.setItem('last_auth_redirect', now.toString())
        sessionStorage.setItem('last_auth_redirect_path', path)
      } catch (e) {
        console.error('SessionStorage error during redirect tracking:', e)
      }
      
      // Perform the actual redirect
      console.log(`[AuthProvider] Safe redirecting to: ${path}`)
      if (replace) {
        router.replace(path)
      } else {
        router.push(path)
      }
    } else {
      console.log(`[AuthProvider] Redirect prevented - cooldown period (path: ${path})`)
    }
  }, [router, lastRedirectTime])
  
  // Initial session check
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitialized) return
    
    // Check if API keys are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      setHasEnvError(true)
      setIsLoading(false)
      setHasInitialized(true)
      return
    }
    
    // Try to recover last redirect time from sessionStorage
    try {
      const storedTime = sessionStorage.getItem('last_auth_redirect')
      if (storedTime) {
        setLastRedirectTime(parseInt(storedTime, 10))
      }
    } catch (e) {
      console.error('SessionStorage error during redirect time recovery:', e)
    }
    
    const setupUser = async () => {
      try {
        // Get auth state from Supabase
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Failed to get session:', error)
          setIsLoading(false)
          setHasInitialized(true)
          return
        }
        
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
          
          // Handle initial redirect if we're authenticated and on an auth page
          // But only if we haven't already initialized to prevent double redirects
          if (!hasInitialized && isAuthPage(pathname)) {
            // Add a small delay to ensure state is updated
            setTimeout(() => {
              safeRedirectWithCooldown('/', true)
            }, 300)
          }
        }
      } catch (e) {
        console.error('Error during auth initialization:', e)
      } finally {
        setIsLoading(false)
        setHasInitialized(true)
      }
    }
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`[AuthProvider] Auth state change: ${event}`)
        
        // Update the state with the new session
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            // If we just signed in and are on an auth page, redirect to chat
            if (isAuthPage(pathname)) {
              // Add a small delay to ensure state is updated
              setTimeout(() => {
                safeRedirectWithCooldown('/', true)
              }, 300)
            }
            break
            
          case 'SIGNED_OUT':
            // If we just signed out, redirect to login page if not already there
            if (!isAuthPage(pathname)) {
              // Add a small delay to ensure state is updated
              setTimeout(() => {
                safeRedirectWithCooldown('/login', true)
              }, 300)
            }
            break
            
          // Handle token refresh silently
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
          case 'PASSWORD_RECOVERY':
            // No navigation needed
            break
            
          case 'INITIAL_SESSION':
            // Only redirect if authenticated and on a login/register page
            if (currentSession && isAuthPage(pathname)) {
              // Add a small delay to ensure state is updated
              setTimeout(() => {
                safeRedirectWithCooldown('/', true)
              }, 300)
            }
            break
        }
      }
    )
    
    // Initial session check
    setupUser()
    
    // Clean up subscription on component unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [router, pathname, supabase, hasInitialized, safeRedirectWithCooldown])
  
  /**
   * Sign in a user with email/password
   */
  const signIn = async (email: string, password: string) => {
    try {
      // Clear any previous errors
      
      if (!email || !password) {
        throw new Error('Email and password are required')
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Sign in error:', error)
        throw error
      }
      
      setSession(data.session)
      setUser(data.session.user)
      
      // Success message
      toast.success('Sign in successful')
      
      // Redirect to home after login
      safeRedirectWithCooldown('/')
    } catch (error: any) {
      console.error('Failed to sign in:', error)
      throw error
    }
  }
  
  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      
      // Clear user state
      setUser(null)
      setSession(null)
      
      // Success message
      toast.success('Signed out successfully')
      
      // Redirect to login
      safeRedirectWithCooldown('/login')
    } catch (error: any) {
      console.error('Failed to sign out:', error)
      toast.error(`Sign out failed: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Refresh the current session
   */
  const refreshSession = async () => {
    try {
      console.log('[AuthProvider] Attempting to refresh session...')
      
      // First try to refresh the session
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthProvider] Session refresh error:', error)
        
        // Check if it's a network error vs auth error
        if (error.message.includes('network') || error.message.includes('fetch')) {
          console.log('[AuthProvider] Network error during refresh - will retry')
          
          // Wait a moment and try one more time for network issues
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // One more attempt
          const retryResult = await supabase.auth.refreshSession()
          if (retryResult.error) {
            console.error('[AuthProvider] Retry session refresh also failed:', retryResult.error)
            throw retryResult.error
          }
          
          if (retryResult.data && retryResult.data.session) {
            console.log('[AuthProvider] Session refresh successful on retry')
            setSession(retryResult.data.session)
            setUser(retryResult.data.session.user)
            return
          }
        }
        
        // For auth errors or failed retries, sign out gracefully
        console.log('[AuthProvider] Session could not be refreshed - signing out')
        
        // Don't throw, try to clean up quietly
        try {
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          
          // Clear any auth-related storage
          try {
            localStorage.removeItem('auth_redirect_count')
            sessionStorage.removeItem('homeRedirectCount')
            sessionStorage.removeItem('home_last_redirect')
            sessionStorage.removeItem('last_auth_redirect')
            sessionStorage.removeItem('last_auth_redirect_path')
          } catch (storageError) {
            console.error('[AuthProvider] Storage cleanup error:', storageError)
          }
        } catch (signOutError) {
          console.error('[AuthProvider] Error during sign out:', signOutError)
        }
        
        throw error
      }
      
      if (data && data.session) {
        console.log('[AuthProvider] Session refreshed successfully')
        setSession(data.session)
        setUser(data.session.user)
      } else {
        console.log('[AuthProvider] No session returned from refresh')
        // Silently clear the state without an error
        setSession(null)
        setUser(null)
      }
    } catch (error: any) {
      console.error('[AuthProvider] Failed to refresh session:', error)
      throw error
    }
  }
  
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
} 