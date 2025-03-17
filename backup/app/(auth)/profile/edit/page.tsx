'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/app/features/button/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/features/card/card'
import { Input } from '@/app/features/input/input'
import { Label } from '@/app/features/label/label'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [username, setUsername] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [refreshSession, setRefreshSession] = useState<(() => Promise<void>) | null>(null)
  
  // Load auth dynamically to avoid SSG issues
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const { useAuth } = await import('@/components/auth/auth-provider')
        const auth = useAuth()
        setUser(auth.user)
        setIsLoading(auth.isLoading)
        setRefreshSession(() => auth.refreshSession)
      } catch (error) {
        console.error('Failed to load auth provider:', error)
        setIsLoading(false)
      }
    }
    
    loadAuth()
  }, [])
  
  useEffect(() => {
    if (user) {
      // Initialize form with current values
      setUsername(user.user_metadata?.username || user.user_metadata?.full_name || '')
    }
  }, [user])
  
  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-4 p-8">
          <h3 className="text-xl font-semibold text-center dark:text-zinc-50">Loading...</h3>
          <p className="text-sm text-gray-500 text-center dark:text-zinc-400">
            Please wait while we load your profile.
          </p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    router.push('/login')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    
    try {
      // Validate username
      if (!username.trim()) {
        toast.error('Username cannot be empty')
        return
      }
      
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { 
          username,
          full_name: username 
        }
      })
      
      if (error) {
        toast.error('Failed to update profile: ' + error.message)
        return
      }
      
      toast.success('Profile updated successfully')
      if (refreshSession) {
        await refreshSession() // Refresh to get updated user data
      }
      router.push('/profile')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Your email address: {user.email}</p>
              {user.app_metadata?.provider === 'google' && (
                <p className="mt-1">Provider: Google</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/profile')}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 

