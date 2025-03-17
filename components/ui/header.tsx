'use client';

import { WorkflowSelector } from './workflow-selector';
import { WorkflowData } from '@/lib/supabase';
import Link from 'next/link';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface HeaderProps {
  onClearChat?: () => void;
  onToggleSidebar?: () => void;
  taskCount?: number;
  workflows?: WorkflowData[];
  activeWorkflowId?: string | null;
  onWorkflowChange?: (id: string | null) => void;
}

export function Header({ 
  onClearChat, 
  onToggleSidebar, 
  taskCount = 0,
  workflows = [],
  activeWorkflowId = null,
  onWorkflowChange
}: HeaderProps) {
  const { user, signOut } = useUser();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">Mimir Assistant</h1>
      </div>
      <div className="flex items-center gap-4">
        {workflows.length > 0 && onWorkflowChange && (
          <WorkflowSelector 
            workflows={workflows}
            activeWorkflowId={activeWorkflowId}
            setActiveWorkflowId={onWorkflowChange}
          />
        )}
        <Link
          href="/agent-dashboard"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Agent Dashboard
        </Link>
        <Link
          href="/workflow-builder"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
          </svg>
          Workflow Builder
        </Link>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 relative"
            aria-label="Toggle task sidebar"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Tasks
            {taskCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs text-white">
                {taskCount}
              </span>
            )}
          </button>
        )}
        {onClearChat && (
          <button
            onClick={onClearChat}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-4 py-2 hover:bg-zinc-100"
          >
            Clear Chat
          </button>
        )}
        
        <Link 
          href="/profile"
          className="group flex items-center gap-2"
        >
          <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 border">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name || 'User'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-100 text-violet-700">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
          <span className="text-sm font-medium">{user?.name || user?.email || 'Account'}</span>
        </Link>
        
        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 h-9 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700"
        >
          {isLoggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </header>
  );
} 