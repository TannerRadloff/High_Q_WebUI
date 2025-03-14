'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { FcGoogle } from 'react-icons/fc'
import { createClient } from '@/lib/supabase/client'
import { getOAuthRedirectUrl } from '@/lib/helpers/url'

import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import { Separator } from '@/src/components/ui/separator'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card'
import { ErrorMessage } from '@/src/components/ui/error-message'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const supabase = createClient()

  const showErrorNotification = (message: string) => {
    setFormError(message)
    toast.error(message, {
      id: 'register-error',
      duration: 5000,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear any previous errors
    setFormError(null)
    
    if (!email || !password || !confirmPassword) {
      showErrorNotification('Please fill in all fields')
      return
    }
    
    if (password !== confirmPassword) {
      showErrorNotification('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      showErrorNotification('Password must be at least 6 characters')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Use the helper function to get a consistent redirect URL
      const redirectUrl = getOAuthRedirectUrl();
      console.log('[Register] Using redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })
      
      if (error) {
        throw error
      }
      
      toast.success('Registration successful! Please check your email to verify your account.')
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      showErrorNotification(error.message || 'Failed to register')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    
    try {
      // Use the helper function to get a consistent redirect URL
      const redirectUrl = getOAuthRedirectUrl();
      console.log('[Register] Using OAuth redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })
      
      if (error) {
        throw error
      }
      
      // We'll be redirected, so no need to handle success here
    } catch (error: any) {
      showErrorNotification(error.message || 'Failed to sign in with Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-0">
      <Card className="mx-auto max-w-sm shadow-xl border-zinc-800/60 bg-gradient-to-b from-zinc-900/70 to-zinc-800/90 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formError && (
              <ErrorMessage
                type="validation"
                message={formError}
                className="mb-2"
              />
            )}
            <div className="space-y-2">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                'Connecting...'
              ) : (
                <>
                  <FcGoogle className="mr-2 h-4 w-4" />
                  Google
                </>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm text-muted-foreground mt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 