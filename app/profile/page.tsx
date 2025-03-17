'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.avatar_url && (
              <div className="flex justify-center">
                <img 
                  src={user.avatar_url}
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium">Name</h3>
              <p className="text-lg">{user?.name || 'Not provided'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Email</h3>
              <p className="text-lg">{user?.email || 'Not provided'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">User ID</h3>
              <p className="text-sm text-gray-500 truncate">{user?.id}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSignOut} 
              variant="destructive" 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing out...' : 'Sign out'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 