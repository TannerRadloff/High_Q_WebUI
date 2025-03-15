import React from 'react';

export const metadata = {
  title: 'Agent Workflows',
  description: 'Manage your agent workflows built with OpenAI Agents SDK',
};

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {children}
    </div>
  );
} 