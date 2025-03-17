'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { fetchWorkflows, deleteWorkflow, AgentWorkflow } from '@/lib/agent-workflow';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load workflows when the page loads
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchWorkflows();
        setWorkflows(data);
      } catch (err) {
        console.error('Failed to load workflows:', err);
        setError('Failed to load your workflows. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  // Handle workflow deletion
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      try {
        setDeletingId(id);
        await deleteWorkflow(id);
        setWorkflows(workflows.filter(workflow => workflow.id !== id));
        toast.success('Workflow deleted successfully');
      } catch (err) {
        console.error('Failed to delete workflow:', err);
        toast.error('Failed to delete workflow');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (err) {
      return 'Unknown date';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Agent Workflows</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your saved agent workflows
          </p>
        </div>
        <button
          onClick={() => router.push('/agent-builder')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Create New Workflow
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-md mb-4">
          {error}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
          <h3 className="text-lg font-medium mb-2">No workflows found</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            You haven't created any agent workflows yet.
          </p>
          <button
            onClick={() => router.push('/agent-builder')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <h3 className="text-lg font-medium mb-1 truncate">{workflow.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                  {workflow.description || 'No description'}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Updated {formatDate(workflow.updated_at)}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => router.push(`/agent-builder?workflow=${workflow.id}`)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(workflow.id)}
                    disabled={deletingId === workflow.id}
                    className={`px-3 py-1 rounded-md text-sm ${
                      deletingId === workflow.id
                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {deletingId === workflow.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 