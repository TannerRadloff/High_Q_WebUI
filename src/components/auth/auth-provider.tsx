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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasEnvError, setHasEnvError] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  // Track if we've already initialized to prevent double initialization
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
    
    console.log('[AuthProvider] Initializing authentication')
    
    const setupUser = async () => {
      try {
        // Get auth state from Supabase
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthProvider] Failed to get session:', error)
          setIsLoading(false)
          return
        }
        
        console.log('[AuthProvider] Retrieved session, authenticated:', !!data.session)
        
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      } catch (e) {
        console.error('[AuthProvider] Unexpected error during auth init:', e)
      } finally {
        setIsLoading(false)
        setHasInitialized(true)
      }
    }
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('[AuthProvider] Auth state changed:', event, 'Session:', !!currentSession)
        
        // Update the state with the new session
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            // If we just signed in, redirect to home page if on auth page
            if (pathname?.includes('/login') || pathname?.includes('/register')) {
              console.log('[AuthProvider] Redirecting to home after sign in')
              router.push('/')
              router.refresh()
            }
            break
            
          case 'SIGNED_OUT':
            // If we just signed out, redirect to login page if not already there
            if (!pathname?.includes('/login')) {
              console.log('[AuthProvider] Redirecting to login after sign out')
              router.push('/login')
              router.refresh()
            }
            break
            
          // Handle other cases as needed
          case 'TOKEN_REFRESHED':
            console.log('[AuthProvider] Token refreshed')
            break
            
          case 'USER_UPDATED':
            console.log('[AuthProvider] User updated')
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
      console.log('[AuthProvider] Signing in...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('[AuthProvider] Sign in error:', error)
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login')) {
          throw new Error('Invalid email or password. Please try again.')
        } else {
          throw error
        }
      }
      
      // Update state with new session information
      console.log('[AuthProvider] Sign in successful')
      toast.success('Signed in successfully')
      
      return
    } catch (error) {
      console.error('[AuthProvider] Sign in exception:', error)
      throw error
    }
  }
  
  /**
   * Sign the user out
   */
  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out...')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[AuthProvider] Sign out error:', error)
        throw error
      }
      
      // State will be updated via the auth state change listener
      console.log('[AuthProvider] Sign out successful')
      toast.success('Signed out successfully')
      
      // Clear state manually as well for extra safety
      setUser(null)
      setSession(null)
      
      return
    } catch (error) {
      console.error('[AuthProvider] Sign out exception:', error)
      throw error
    }
  }
  
  /**
   * Refresh the session
   */
  const refreshSession = async () => {
    try {
      console.log('[AuthProvider] Refreshing session...')
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthProvider] Session refresh error:', error)
        throw error
      }
      
      console.log('[AuthProvider] Session refresh successful')
      
      // Update state with refreshed session
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
      
      return
    } catch (error) {
      console.error('[AuthProvider] Session refresh exception:', error)
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
 * Hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
} 