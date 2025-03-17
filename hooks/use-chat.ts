'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkflow } from '@/contexts/workflow-context';
import { Node, Edge } from 'reactflow';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  agent?: string;
  result?: string;
  createdAt: Date;
  updatedAt: Date;
  workflowId?: string;
  workflowNodeId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'mimir' | 'agent';
  agentName?: string;
  content: string;
  timestamp: Date;
  tasks?: Task[];
  taskId?: string;
  taskStatus?: string;
  workflowId?: string;
}

// Helper function to parse stored messages
const parseStoredMessages = (storedMessages: string | null): ChatMessage[] => {
  if (!storedMessages) return [];
  try {
    return JSON.parse(storedMessages).map((message: any) => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
  } catch (error) {
    console.error('Error parsing stored messages:', error);
    return [];
  }
};

export function useChat() {
  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      return parseStoredMessages(localStorage.getItem('chatMessages'));
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Get workflow context
  const { activeWorkflowId, workflows } = useWorkflow();
  
  // Get the active workflow data
  const activeWorkflow = activeWorkflowId 
    ? workflows.find(w => w.id === activeWorkflowId) 
    : null;

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Function to send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // If there's an active workflow, process through that
      if (activeWorkflowId && activeWorkflow) {
        await processWithWorkflow(content, activeWorkflow);
      } else {
        // Otherwise, process with dynamic delegation
        await processWithDynamicDelegation(content);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'mimir',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkflowId, activeWorkflow]);

  // Process a message using dynamic delegation (standard processing)
  const processWithDynamicDelegation = async (content: string) => {
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create initial response
    const initialResponse: ChatMessage = {
      id: Date.now().toString(),
      sender: 'mimir',
      content: 'I\'ll help you with that. Let me delegate this task appropriately.',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, initialResponse]);
    
    // Determine which agent to use based on content
    let agentType = 'Research';
    
    if (content.toLowerCase().includes('code') || content.toLowerCase().includes('program')) {
      agentType = 'Code';
    } else if (content.toLowerCase().includes('analyze') || content.toLowerCase().includes('analysis')) {
      agentType = 'Analysis';
    } else if (content.toLowerCase().includes('data') || content.toLowerCase().includes('process')) {
      agentType = 'Data Processing';
    } else if (content.toLowerCase().includes('write') || content.toLowerCase().includes('content')) {
      agentType = 'Content Creation';
    } else if (content.toLowerCase().includes('test') || content.toLowerCase().includes('quality')) {
      agentType = 'QA Testing';
    }
    
    // Create a task
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${agentType} Task`,
      description: `Processing: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      status: 'queued',
      agent: agentType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add task to tasks list
    setTasks(prev => [...prev, task]);
    
    // Update task status to in_progress
    task.status = 'in_progress';
    task.updatedAt = new Date();
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    
    // Add agent message
    const agentMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      agentName: agentType,
      content: `I'm working on this request: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      timestamp: new Date(),
      taskId: task.id,
      taskStatus: 'in_progress',
    };
    
    setMessages(prev => [...prev, agentMessage]);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a result based on agent type
    let result = '';
    switch (agentType) {
      case 'Research':
        result = 'After researching this topic, I found several relevant sources. The consensus indicates that ' + 
                 content.substring(0, 20) + ' is related to ' + 
                 ['emerging technologies', 'recent market trends', 'scientific discoveries', 'industry best practices'][Math.floor(Math.random() * 4)] + 
                 '. Would you like more specific information on any aspect?';
        break;
      case 'Code':
        result = 'I\'ve analyzed your coding request. Based on common patterns, I would recommend implementing a ' + 
                 ['function', 'class', 'module', 'service'][Math.floor(Math.random() * 4)] + 
                 ' to handle this efficiently. Would you like me to generate the code for you?';
        break;
      case 'Analysis':
        result = 'I\'ve completed my analysis of the data related to your request. The key insights show that ' + 
                 ['there is a positive correlation', 'the trend is declining', 'the pattern is cyclical', 'the distribution is uneven'][Math.floor(Math.random() * 4)] + 
                 '. Do you want me to prepare a more detailed report?';
        break;
      case 'Data Processing':
        result = 'I\'ve processed the data as requested. The results show ' + 
                 ['approximately 15% improvement', 'significant outliers', 'consistent patterns', 'areas for optimization'][Math.floor(Math.random() * 4)] + 
                 '. Would you like me to visualize these findings?';
        break;
      case 'Content Creation':
        result = 'I\'ve drafted content based on your request. The key points covered include ' + 
                 ['the main benefits', 'potential challenges', 'strategic approaches', 'implementation steps'][Math.floor(Math.random() * 4)] + 
                 '. Would you like me to refine any particular section?';
        break;
      case 'QA Testing':
        result = 'I\'ve completed testing related to your request. The results indicate ' + 
                 ['all tests passed successfully', 'some edge cases need attention', 'performance could be optimized', 'security aspects should be reviewed'][Math.floor(Math.random() * 4)] + 
                 '. Would you like a detailed test report?';
        break;
      default:
        result = 'I\'ve processed your request and compiled the relevant information. Is there anything specific you\'d like me to elaborate on?';
    }
    
    // Update task with result
    task.status = 'completed';
    task.result = result;
    task.updatedAt = new Date();
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    
    // Add completed message
    const completedMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      agentName: agentType,
      content: result,
      timestamp: new Date(),
      taskId: task.id,
      taskStatus: 'completed',
    };
    
    setMessages(prev => [...prev, completedMessage]);
  };

  // Process a message using a workflow
  const processWithWorkflow = async (content: string, workflow: any) => {
    // Extract nodes and edges from the workflow
    const { nodes, edges } = workflow.graph;
    
    // Sort nodes by their Y position (top to bottom)
    const sortedNodes = [...nodes].sort((a: Node, b: Node) => {
      return a.position.y - b.position.y;
    });
    
    // Create an initial response message
    const initialResponse: ChatMessage = {
      id: Date.now().toString(),
      sender: 'mimir',
      content: `Processing your request using the "${workflow.name}" workflow...`,
      timestamp: new Date(),
      workflowId: workflow.id,
    };
    
    setMessages(prev => [...prev, initialResponse]);

    // Process each node in sequence
    for (const node of sortedNodes) {
      // Create a task for this node
      const task: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: node.data.label,
        description: node.data.instructions || `Processing with ${node.data.label}`,
        status: 'queued',
        agent: node.data.agentType,
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowId: workflow.id,
        workflowNodeId: node.id,
      };
      
      // Add task to tasks list
      setTasks(prev => [...prev, task]);
      
      // Update task status to in_progress
      task.status = 'in_progress';
      task.updatedAt = new Date();
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      
      // Add agent message
      const agentMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'agent',
        agentName: node.data.agentType,
        content: `Working on: ${node.data.instructions || 'Processing your request'}`,
        timestamp: new Date(),
        taskId: task.id,
        taskStatus: 'in_progress',
        workflowId: workflow.id,
      };
      
      setMessages(prev => [...prev, agentMessage]);
      
      // Simulate processing time based on node complexity
      const processingTime = 1500 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Generate a result based on node type
      let result = '';
      switch (node.data.agentType) {
        case 'Research':
          result = 'Found relevant information from multiple sources.';
          break;
        case 'Code':
          result = 'Generated code based on requirements.';
          break;
        case 'Analysis':
          result = 'Analyzed the data and identified key patterns.';
          break;
        case 'Data Processing':
          result = 'Processed and structured the data for analysis.';
          break;
        case 'Content Creation':
          result = 'Created a comprehensive report with key findings.';
          break;
        case 'QA Testing':
          result = 'Validated the results and ensured quality standards.';
          break;
        case 'Data':
          result = 'Extracted data from the provided file.';
          break;
        default:
          result = 'Task completed successfully.';
      }
      
      // Add more context based on the user's query
      result += ` Regarding "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`;
      
      // Update task with result
      task.status = 'completed';
      task.result = result;
      task.updatedAt = new Date();
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      
      // Update agent message
      const completedMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'agent',
        agentName: node.data.agentType,
        content: result,
        timestamp: new Date(),
        taskId: task.id,
        taskStatus: 'completed',
        workflowId: workflow.id,
      };
      
      setMessages(prev => [...prev, completedMessage]);
    }
    
    // Add final summary message
    const summaryMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'mimir',
      content: `The "${workflow.name}" workflow has been completed. All ${sortedNodes.length} steps were processed successfully.`,
      timestamp: new Date(),
      workflowId: workflow.id,
    };
    
    setMessages(prev => [...prev, summaryMessage]);
  };

  const clearChat = useCallback(() => {
    setMessages([]);
    setTasks([]);
    localStorage.removeItem('chatMessages');
  }, []);

  const addTaskInstruction = useCallback((taskId: string, instruction: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              description: task.description + "\n\nAdditional instructions: " + instruction,
              updatedAt: new Date()
            } 
          : task
      )
    );
    
    // Add a message for the instruction
    const instructionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Additional instruction for task: ${instruction}`,
      timestamp: new Date(),
      taskId
    };
    
    setMessages(prev => [...prev, instructionMessage]);
  }, []);

  const redirectTask = useCallback((taskId: string, newAgent: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              agent: newAgent,
              status: 'queued',
              updatedAt: new Date()
            } 
          : task
      )
    );
    
    // Add a message for the redirection
    const redirectMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Redirecting task to ${newAgent} agent`,
      timestamp: new Date(),
      taskId
    };
    
    setMessages(prev => [...prev, redirectMessage]);
    
    // Simulate the new agent picking up the task after a short delay
    setTimeout(() => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Mark as in progress
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId 
              ? { ...t, status: 'in_progress', updatedAt: new Date() } 
              : t
          )
        );
        
        // Add a message from the new agent
        const agentMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: 'agent',
          agentName: newAgent,
          content: `I'm now handling this task. I'll get back to you soon.`,
          timestamp: new Date(),
          taskId,
          taskStatus: 'in_progress'
        };
        
        setMessages(prev => [...prev, agentMessage]);
        
        // Simulate the agent completing the task after a delay
        setTimeout(() => {
          // Mark as completed
          setTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === taskId 
                ? { 
                    ...t, 
                    status: 'completed', 
                    result: `Task completed by ${newAgent} agent. The agent approached this differently and has successfully addressed the original request.`,
                    updatedAt: new Date() 
                  } 
                : t
            )
          );
          
          // Add a completion message
          const completionMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'agent',
            agentName: newAgent,
            content: `I've completed the task. The task was to ${task.description}. I've approached this differently and successfully addressed the request.`,
            timestamp: new Date(),
            taskId,
            taskStatus: 'completed'
          };
          
          setMessages(prev => [...prev, completionMessage]);
        }, 3000); // Complete after 3 seconds
      }
    }, 1000); // Start after 1 second
  }, [tasks]);

  const stopTask = useCallback((taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: 'failed',
              updatedAt: new Date()
            } 
          : task
      )
    );
    
    // Add a message for stopping the task
    const stopMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Stopping task`,
      timestamp: new Date(),
      taskId
    };
    
    setMessages(prev => [...prev, stopMessage]);
    
    // Add a confirmation message
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'mimir',
      content: `The task has been stopped. Let me know if you'd like to try a different approach.`,
      timestamp: new Date(),
      taskId,
      taskStatus: 'failed'
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
  }, []);

  return {
    messages,
    isLoading,
    tasks,
    sendMessage,
    clearChat,
    addTaskInstruction,
    redirectTask,
    stopTask
  };
} 