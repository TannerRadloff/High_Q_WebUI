'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Set delegation as the default agent in local storage
    localStorage.setItem('selected-agent-id', 'delegation');
    
    // Redirect to the main chat UI
    router.push('/');
  }, [router]);
  
  return (
    <div className="flex-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-medium mb-4">Agent Interface</h2>
        <p className="text-muted-foreground mb-2">The agent interface is now integrated into the main chat.</p>
        <p className="text-muted-foreground">Redirecting you to the home page...</p>
      </div>
    </div>
  );
} 