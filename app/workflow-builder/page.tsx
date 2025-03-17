'use client';

import { useRouter } from 'next/navigation';
import WorkflowBuilder from '@/components/workflow/workflow-builder';

export default function WorkflowBuilderPage() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Agent Workflow Builder</h1>
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Back to Chat
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <WorkflowBuilder />
      </div>
    </div>
  );
} 