'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'

export default function AuthCheckPage() {
  const { user, session, isLoading, refreshSession } = useAuth()
  const router = useRouter()
  const [diagnosisResult, setDiagnosisResult] = useState<string>('')
  const [isChecking, setIsChecking] = useState(true)
  const [errorDetails, setErrorDetails] = useState<Record<string, any>>({})
  const [recoveryAttempted, setRecoveryAttempted] = useState(false)
  
  // Run diagnosis on mount
  useEffect(() => {
    async function runDiagnosis() {
      try {
        // Wait for auth state to be loaded
        if (isLoading) return
        
        console.log('[AuthCheck] Starting auth diagnosis')
        setIsChecking(true)
        
        // Collect information about auth state
        const authInfo = {
          hasUser: !!user,
          hasSession: !!session,
          sessionExpiry: session?.expires ? new Date(session.expires).toISOString() : 'N/A',
          pathname: window.location.pathname,
          href: window.location.href,
          authCookies: document.cookie.split(';')
            .filter(cookie => 
              cookie.trim().toLowerCase().includes('auth') || 
              cookie.trim().toLowerCase().includes('sb-')
            )
            .map(cookie => cookie.trim()),
        }
        
        setErrorDetails(authInfo)
        
        // Check for session expiry
        if (session && session.expires) {
          const expiryDate = new Date(session.expires)
          const now = new Date()
          
          if (expiryDate < now) {
            setDiagnosisResult('expired_session')
            return
          }
        }
        
        // Check for inconsistent state
        if (!user && session) {
          setDiagnosisResult('missing_user')
          return
        }
        
        if (user && !session) {
          setDiagnosisResult('missing_session')
          return
        }
        
        if (!user && !session) {
          setDiagnosisResult('not_authenticated')
          return
        }
        
        // All seems good
        setDiagnosisResult('authenticated')
      } catch (error) {
        console.error('[AuthCheck] Diagnosis error:', error)
        setDiagnosisResult('error')
        setErrorDetails(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }))
      } finally {
        setIsChecking(false)
      }
    }
    
    runDiagnosis()
  }, [user, session, isLoading])
  
  // Attempt to recover from auth issues
  const attemptRecovery = async () => {
    try {
      setIsChecking(true)
      setRecoveryAttempted(true)
      
      // Try refreshing the session as a recovery mechanism
      await refreshSession()
      
      // Check results after refresh
      if (user && session) {
        setDiagnosisResult('recovered')
      } else {
        setDiagnosisResult('recovery_failed')
      }
    } catch (error) {
      console.error('[AuthCheck] Recovery error:', error)
      setDiagnosisResult('recovery_error')
      setErrorDetails(prev => ({ 
        ...prev, 
        recoveryError: error instanceof Error ? error.message : String(error) 
      }))
    } finally {
      setIsChecking(false)
    }
  }
  
  // Go to home if authenticated
  const goToHome = () => {
    router.push('/')
  }
  
  // Go to login
  const goToLogin = () => {
    router.push('/login?from=auth-check')
  }
  
  // Clear browser storage
  const clearStorage = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      
      // Wait a moment and reload
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('[AuthCheck] Storage clear error:', error)
      alert('Failed to clear storage. Please try again or clear manually.')
    }
  }
  
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12">
        <div className="w-full max-w-md space-y-8 px-4 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Checking Authentication Status</h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we diagnose your authentication state...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Authentication Diagnosis</h1>
          <p className="text-sm text-muted-foreground">
            {diagnosisResult === 'authenticated' && 'You are currently authenticated and everything looks good.'}
            {diagnosisResult === 'not_authenticated' && 'You are not currently authenticated. Please sign in.'}
            {diagnosisResult === 'expired_session' && 'Your session has expired. Please sign in again.'}
            {diagnosisResult === 'missing_user' && 'Authentication issue detected: Session exists but user is missing.'}
            {diagnosisResult === 'missing_session' && 'Authentication issue detected: User exists but session is missing.'}
            {diagnosisResult === 'error' && 'An error occurred while checking your authentication status.'}
            {diagnosisResult === 'recovered' && 'Successfully recovered your authentication status!'}
            {diagnosisResult === 'recovery_failed' && 'Recovery attempt failed. Please sign in again.'}
            {diagnosisResult === 'recovery_error' && 'An error occurred during recovery.'}
          </p>
        </div>
        
        <div className="rounded-lg border p-4">
          <div className="space-y-4">
            {diagnosisResult === 'authenticated' && (
              <div className="flex justify-center">
                <Button onClick={goToHome} className="w-full">
                  Continue to Home
                </Button>
              </div>
            )}
            
            {(diagnosisResult === 'not_authenticated' || 
              diagnosisResult === 'expired_session' || 
              (diagnosisResult === 'recovery_failed' && recoveryAttempted)) && (
              <div className="flex justify-center">
                <Button onClick={goToLogin} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}
            
            {['missing_user', 'missing_session', 'error'].includes(diagnosisResult) && !recoveryAttempted && (
              <div className="flex justify-center">
                <Button onClick={attemptRecovery} className="w-full">
                  Attempt Recovery
                </Button>
              </div>
            )}
            
            {diagnosisResult === 'recovered' && (
              <div className="flex justify-center">
                <Button onClick={goToHome} className="w-full">
                  Continue to Home
                </Button>
              </div>
            )}
            
            <div className="flex justify-center pt-2">
              <Button onClick={clearStorage} variant="outline" className="w-full">
                Clear Browser Storage
              </Button>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Diagnosis Details:</p>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 