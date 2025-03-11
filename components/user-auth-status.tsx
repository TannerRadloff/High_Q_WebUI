'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';
import Link from 'next/link';
import Image from 'next/image';

export function UserAuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="text-sm">Loading...</div>;
  }

  if (status === 'authenticated' && session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <div className="relative h-8 w-8 overflow-hidden rounded-full">
            <Image
              src={session.user.image}
              alt={session.user.name || 'User'}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{session.user.name}</span>
          <span className="text-xs text-gray-500">{session.user.email}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
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