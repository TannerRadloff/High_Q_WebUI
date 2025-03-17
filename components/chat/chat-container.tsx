'use client';

import { useEffect, useRef, useState } from 'react';
import { Header } from '../ui/header';
import { Message } from './message';
import { ChatInput } from './input';
import { TaskSidebar } from '../ui/task-sidebar';
import { useChat } from '@/hooks/use-chat';
import { useWorkflow } from '@/contexts/workflow-context';

export function ChatContainer() {
  const { 
    messages, 
    isLoading, 
    tasks, 
    sendMessage, 
    clearChat,
    addTaskInstruction,
    redirectTask,
    stopTask
  } = useChat();
  const { workflows, activeWorkflowId, setActiveWorkflowId } = useWorkflow();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header 
        onClearChat={clearChat} 
        onToggleSidebar={toggleSidebar} 
        taskCount={tasks.length}
        workflows={workflows}
        activeWorkflowId={activeWorkflowId}
        onWorkflowChange={setActiveWorkflowId}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <main className={`flex-1 overflow-y-auto pb-32 transition-all duration-300 ${sidebarOpen ? 'mr-80' : ''}`}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-gray-500">
                No messages yet. Start a conversation with Mimir!
              </p>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  sender={message.sender}
                  agentName={message.agentName}
                  content={message.content}
                  timestamp={message.timestamp}
                  workflowId={message.workflowId}
                />
              ))}
              {isLoading && (
                <Message
                  sender="mimir"
                  content=""
                  timestamp={new Date()}
                  isLoading={true}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>
        <TaskSidebar 
          tasks={tasks} 
          isOpen={sidebarOpen} 
          onClose={toggleSidebar}
          onAddInstruction={addTaskInstruction}
          onRedirectTask={redirectTask}
          onStopTask={stopTask}
        />
      </div>
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}