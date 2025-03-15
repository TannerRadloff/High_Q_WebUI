import React from 'react';

export const metadata = {
  title: 'Agent Workflow Builder',
  description: 'Build agent workflows using the OpenAI Agents SDK',
};

export default function AgentBuilderLayout({
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