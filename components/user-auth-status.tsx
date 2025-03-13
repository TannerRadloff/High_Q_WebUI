'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function UserAuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
      }
      
      setUser(session?.user || null);
      setLoading(false);
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Error signing out');
        console.error('Sign out error:', error);
        return;
      }
      
      toast.success('Signed out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out exception:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return <div className="text-sm">Loading...</div>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <div className="relative size-8 overflow-hidden rounded-full">
            <Image
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.name || 'User'}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.user_metadata?.name || user.email}</span>
          <span className="text-xs text-gray-500">{user.email}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      </Link>
      <Link href="/register">
        <Button size="sm">Sign up</Button>
      </Link>
    </div>
  );
} 