'use client';

import React from 'react';
import Navigation from '../components/navigation';

export default function AgentModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <h1 className="text-lg font-bold mr-8">Mimir</h1>
              <Navigation />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
} 

