'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useUser();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await signOut();
        router.push('/auth/login');
      } catch (error) {
        console.error('Error signing out:', error);
        router.push('/auth/login');
      }
    };

    performLogout();
  }, [signOut, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-md shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Signing you out...</h1>
        <p className="text-gray-600">You'll be redirected to the login page shortly.</p>
      </div>
    </div>
  );
} 