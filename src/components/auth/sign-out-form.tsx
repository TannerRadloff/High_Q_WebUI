'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export const SignOutForm = () => {
  const router = useRouter();
  const supabase = createClient();
  
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
  
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
