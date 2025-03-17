'use client';

import { useState } from 'react';
import { WorkflowData } from '@/lib/supabase';
import Link from 'next/link';

interface WorkflowSelectorProps {
  workflows: WorkflowData[];
  activeWorkflowId: string | null;
  setActiveWorkflowId: (id: string | null) => void;
}

export function WorkflowSelector({ 
  workflows,
  activeWorkflowId, 
  setActiveWorkflowId 
}: WorkflowSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-50 focus:outline-none"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-4 h-4 mr-2" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
        </svg>
        {activeWorkflowId 
          ? `Workflow: ${workflows.find(w => w.id === activeWorkflowId)?.name || 'Selected'}` 
          : 'Auto Delegation'}
        <svg 
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute z-10 w-56 mt-2 bg-white border rounded-md shadow-lg"
          onBlur={() => setIsOpen(false)}
        >
          <div className="py-1">
            <button
              onClick={() => {
                setActiveWorkflowId(null);
                setIsOpen(false);
              }}
              className={`block w-full px-4 py-2 text-sm text-left ${!activeWorkflowId ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Auto Delegation (Default)
            </button>
            
            {workflows.length > 0 && (
              <div className="border-t border-gray-100 pt-1">
                <p className="px-4 py-1 text-xs text-gray-500">Your Workflows</p>
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => {
                      setActiveWorkflowId(workflow.id || null);
                      setIsOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-sm text-left ${activeWorkflowId === workflow.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {workflow.name}
                  </button>
                ))}
              </div>
            )}
            
            <div className="border-t border-gray-100 pt-1">
              <Link
                href="/workflow-builder"
                className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                Edit Workflows
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 