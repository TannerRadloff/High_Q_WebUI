'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the AgentModeInterface to avoid loading it until needed
const AgentModeInterface = dynamic(() => import('@/app/components/AgentModeInterface'), {
  loading: () => <div className="flex items-center justify-center h-full">Loading agent interface...</div>,
  ssr: false
});

export default function AgentModePage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="border-b p-4 bg-white">
        <h1 className="text-xl font-bold">Mimir Agent Platform</h1>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <AgentModeInterface />
      </main>
    </div>
  );
} 

