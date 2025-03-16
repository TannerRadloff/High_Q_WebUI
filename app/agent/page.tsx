'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the agent dashboard instead of home
    router.push('/agent-dashboard');
  }, [router]);
  
  return (
    <div className="flex-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-medium mb-4">Agent Interface</h2>
        <p className="text-muted-foreground mb-2">The agent interface has been upgraded to a dashboard.</p>
        <p className="text-muted-foreground">Redirecting you to the new Agent Dashboard...</p>
      </div>
    </div>
  );
} 