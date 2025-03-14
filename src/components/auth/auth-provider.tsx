'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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

// Helper to safely redirect to avoid loops
function safeRedirect(path: string, forceReload = false) {
  // Get the current location
  const currentPath = window.location.pathname;
  
  // Check if we're already on the target path to avoid unnecessary redirects
  if (currentPath === path) {
    console.log('Already on target path, skipping redirect');
    return;
  }
  
  // Implement a rate limit for redirects to prevent loops
  // With localStorage availability check
  try {
    const redirectKey = 'auth_redirect_timestamp';
    let shouldRedirect = true;
    
    // Only use localStorage if available
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const lastRedirect = localStorage.getItem(redirectKey);
        const now = Date.now();
        
        // Only allow redirects if we haven't redirected in the last 5 seconds
        shouldRedirect = !lastRedirect || (now - parseInt(lastRedirect)) > 5000;
        
        if (shouldRedirect) {
          localStorage.setItem(redirectKey, now.toString());
        } else {
          console.log('Redirect throttled to prevent loops');
        }
      } catch (e) {
        // localStorage might throw in private browsing or if quota is exceeded
        console.warn('localStorage error, proceeding with redirect:', e);
        shouldRedirect = true;
      }
    }
    
    // Proceed with redirect if allowed
    if (shouldRedirect) {
      // Use direct location change for more reliable cross-domain redirects
      if (forceReload) {
        window.location.href = path;
      } else {
        // For safer in-app redirects
        window.location.assign(path);
      }
    }
  } catch (e) {
    // Fallback if any error occurs in redirection
    console.error('Redirect error:', e);
    window.location.href = path;
  }
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
  
  // Initial session check
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitialized) return
    
    // Check if API keys are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      setHasEnvError(true)
      setIsLoading(false)
      return
    }
    
    const setupUser = async () => {
      try {
        // Get auth state from Supabase
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Failed to get session:', error)
          setIsLoading(false)
          return
        }
        
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
          
          // Handle initial redirect if we're authenticated and on an auth page
          if (isAuthPage(pathname)) {
            safeRedirect('/', true);
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
        // Update the state with the new session
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            // If we just signed in and are on an auth page, redirect to chat
            if (isAuthPage(pathname)) {
              safeRedirect('/', true);
            }
            break
            
          case 'SIGNED_OUT':
            // If we just signed out, redirect to login page if not already there
            if (!isAuthPage(pathname)) {
              safeRedirect('/login');
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
              safeRedirect('/', true);
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
  }, [router, pathname, supabase, hasInitialized])
  
  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Sign in error:', error)
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login')) {
          throw new Error('Invalid email or password. Please try again.')
        } else {
          throw error
        }
      }
      
      // Update state with new session information
      toast.success('Signed in successfully')
      
      // Manually redirect to ensure it happens
      safeRedirect('/', true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }
  
  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      
      // Auth state change will handle redirection
      toast.success('Signed out successfully')
      
      // Ensure redirect happens
      safeRedirect('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
      throw error
    }
  }
  
  /**
   * Refresh the current session
   */
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        throw error
      }
      
      if (data && data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
    } catch (error: any) {
      console.error('Failed to refresh session:', error)
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