'use client';

import React from 'react';
import AgentModeInterface from '../components/AgentModeInterface';

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

