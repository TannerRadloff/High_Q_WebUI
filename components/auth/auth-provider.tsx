'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    console.log('[AuthProvider] Initializing')
    const setupUser = async () => {
      setIsLoading(true)
      
      try {
        console.log('[AuthProvider] Getting current session...')
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthProvider] Error getting session:', sessionError)
          return
        }
        
        console.log('[AuthProvider] Session retrieved:', { 
          hasSession: !!currentSession,
          user: currentSession?.user?.email
        })
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Set up auth state listener
        console.log('[AuthProvider] Setting up auth state change listener...')
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, updatedSession: Session | null) => {
            console.log('[AuthProvider] Auth state changed:', { 
              event, 
              hasSession: !!updatedSession,
              user: updatedSession?.user?.email
            })
            
            setSession(updatedSession)
            setUser(updatedSession?.user ?? null)
            
            // Handle specific auth events
            switch (event) {
              case 'SIGNED_IN':
                // Force refresh and redirect to home
                router.refresh()
                window.location.href = '/'
                break
              case 'SIGNED_OUT':
                // Clear state and redirect to login
                setUser(null)
                setSession(null)
                router.refresh()
                window.location.href = '/login'
                break
              default:
                router.refresh()
            }
          }
        )
        
        return () => {
          console.log('[AuthProvider] Cleaning up auth subscription')
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('[AuthProvider] Error setting up auth:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    setupUser()
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthProvider] Attempting sign in:', { email })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('[AuthProvider] Sign in error:', error)
        toast.error(error.message || 'Failed to sign in')
        throw error
      }

      console.log('[AuthProvider] Sign in successful:', {
        hasSession: !!data.session,
        user: data.user?.email
      })
      
      // The onAuthStateChange handler will handle the redirect
    } catch (error: any) {
      console.error('[AuthProvider] Sign in exception:', error)
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[AuthProvider] Sign out error:', error)
        toast.error(error.message || 'Failed to sign out')
        return
      }
      
      // The onAuthStateChange handler will handle the redirect and state cleanup
    } catch (error: any) {
      console.error('[AuthProvider] Sign out exception:', error)
      toast.error(error.message || 'Failed to sign out')
    }
  }

  const refreshSession = async () => {
    try {
      console.log('[AuthProvider] Refreshing session...')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthProvider] Session refresh error:', error)
        throw error
      }
      
      console.log('[AuthProvider] Session refreshed:', {
        hasSession: !!data.session,
        user: data.session?.user?.email
      })
      
      setSession(data.session)
      setUser(data.session?.user ?? null)
      router.refresh()
    } catch (error: any) {
      console.error('[AuthProvider] Error refreshing session:', error)
      if (error.message?.includes('expired')) {
        toast.error('Your session has expired. Please sign in again.')
        await signOut()
      }
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
} 