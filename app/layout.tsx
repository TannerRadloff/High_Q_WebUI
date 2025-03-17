import './globals.css';
import { UserProvider } from '@/contexts/user-context';
import { WorkflowProvider } from '@/contexts/workflow-context';
import { AgentProvider } from '@/contexts/agent-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'AI Agent Workflow Builder',
  description: 'Build and manage AI agent workflows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <WorkflowProvider>
            <AgentProvider>
              {children}
              <Toaster />
            </AgentProvider>
          </WorkflowProvider>
        </UserProvider>
      </body>
    </html>
  );
} 