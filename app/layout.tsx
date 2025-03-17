import './globals.css';
import { UserProvider } from '@/contexts/user-context';
import { WorkflowProvider } from '@/contexts/workflow-context';
import { AgentProvider } from '@/contexts/agent-context';
import { Toaster } from '@/components/ui/toaster';
import { TaskProvider } from '@/contexts/task-context';

export const metadata = {
  title: 'Mimir - AI Orchestration',
  description: 'An AI orchestration system with dynamic delegation',
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
            <TaskProvider>
              <AgentProvider>
                {children}
                <Toaster />
              </AgentProvider>
            </TaskProvider>
          </WorkflowProvider>
        </UserProvider>
      </body>
    </html>
  );
} 