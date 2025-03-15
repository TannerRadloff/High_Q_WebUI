'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// Import existing components
import Canvas from '@/components/agents-dashboard/Canvas';
import AgentItem from '@/components/agents-dashboard/AgentItem';
import PropertiesPanel from '@/components/agents-dashboard/PropertiesPanel';
import { Agent, AgentType, AGENT_TEMPLATES, Connection } from '@/components/agents-dashboard/types';

// Import workflow API functions
import { createWorkflow, updateWorkflow, fetchWorkflow } from '@/lib/agent-workflow';

/**
 * AgentBuilder - A page for building agent workflows using a drag-and-drop interface
 */
export default function AgentBuilder() {
  // State for managing agents and connections
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  
  // State for connection creation
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  
  // State for workflow management
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId) || null;

  // Load workflow if workflow ID is provided in URL
  useEffect(() => {
    const workflowId = searchParams?.get('workflow');
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [searchParams]);

  // Load a workflow from the server
  const loadWorkflow = async (workflowId: string) => {
    try {
      setIsLoading(true);
      const workflow = await fetchWorkflow(workflowId);
      
      if (workflow) {
        setWorkflowName(workflow.name);
        setWorkflowDescription(workflow.description);
        setCurrentWorkflowId(workflow.id);
        
        // Set agents and connections if available
        if (workflow.agents) {
          setAgents(workflow.agents);
        }
        
        if (workflow.connections) {
          setConnections(workflow.connections);
        }
        
        toast.success(`Workflow "${workflow.name}" loaded successfully`);
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast.error('Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drag end event (when an agent is dropped on the canvas)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Only proceed if the item was dropped over the canvas
    if (over && over.id === 'canvas') {
      // Get the agent type from the dragged item ID
      const agentType = active.id as AgentType;
      
      // Create a new agent with default position
      const newAgent: Agent = {
        id: uuidv4(),
        type: agentType,
        position: {
          x: Math.random() * 400 + 50, // Random position within the canvas
          y: Math.random() * 300 + 50,
        },
        config: {
          ...AGENT_TEMPLATES[agentType].config!
        }
      };
      
      // Add the new agent to the state
      setAgents(prevAgents => [...prevAgents, newAgent]);
      
      // Select the newly created agent
      setSelectedAgentId(newAgent.id);
    }
  };

  // Handle agent selection
  const handleAgentSelect = (agent: Agent) => {
    // If we're creating a connection
    if (isCreatingConnection) {
      if (connectionSource) {
        // Don't allow connections to self
        if (connectionSource === agent.id) {
          setIsCreatingConnection(false);
          setConnectionSource(null);
          return;
        }
        
        // Create a new connection
        const newConnection: Connection = {
          id: uuidv4(),
          sourceAgentId: connectionSource,
          targetAgentId: agent.id,
          label: 'Handoff'
        };
        
        // Add the connection
        setConnections(prevConnections => [...prevConnections, newConnection]);
        
        // Reset connection creation state
        setIsCreatingConnection(false);
        setConnectionSource(null);
      }
    } else {
      // Normal selection
      setSelectedAgentId(agent.id);
    }
  };

  // Start creating a connection from an agent
  const handleStartConnection = (agentId: string) => {
    setIsCreatingConnection(true);
    setConnectionSource(agentId);
  };

  // Cancel connection creation
  const handleCancelConnection = () => {
    setIsCreatingConnection(false);
    setConnectionSource(null);
  };

  // Handle agent update (from properties panel)
  const handleAgentUpdate = (updatedAgent: Agent) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      )
    );
  };

  // Handle agent deletion
  const handleAgentDelete = (agentId: string) => {
    // Remove the agent
    setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId));
    
    // Remove any connections involving this agent
    setConnections(prevConnections => 
      prevConnections.filter(
        conn => conn.sourceAgentId !== agentId && conn.targetAgentId !== agentId
      )
    );
    
    // Deselect if the deleted agent was selected
    if (selectedAgentId === agentId) {
      setSelectedAgentId(null);
    }
  };

  // Handle connection deletion
  const handleDeleteConnection = (connectionId: string) => {
    setConnections(prevConnections => 
      prevConnections.filter(conn => conn.id !== connectionId)
    );
  };

  // Handle connection point click
  const handleConnectionPointClick = (agentId: string, isSource: boolean) => {
    if (isCreatingConnection) {
      // If we're already creating a connection and this is a target point
      if (!isSource && connectionSource) {
        // Create a new connection
        const newConnection: Connection = {
          id: uuidv4(),
          sourceAgentId: connectionSource,
          targetAgentId: agentId,
          label: 'Handoff'
        };
        
        // Add the connection
        setConnections(prevConnections => [...prevConnections, newConnection]);
        
        // Reset connection creation state
        setIsCreatingConnection(false);
        setConnectionSource(null);
      }
    } else if (isSource) {
      // Start creating a connection from this source point
      setIsCreatingConnection(true);
      setConnectionSource(agentId);
    }
  };

  // Handle agent position change when dragged
  const handleAgentPositionChange = (agentId: string, position: { x: number; y: number }) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === agentId ? { ...agent, position } : agent
      )
    );
  };

  // Save the workflow
  const handleSaveWorkflow = async () => {
    try {
      if (!workflowName.trim()) {
        toast.error('Please enter a workflow name');
        return;
      }

      setIsSaving(true);
      
      // Determine the entry point agent (first agent for now)
      const entryPointAgentId = agents.length > 0 ? agents[0].id : '';
      
      // Either update an existing workflow or create a new one
      if (currentWorkflowId) {
        await updateWorkflow(
          currentWorkflowId,
          workflowName,
          workflowDescription,
          agents,
          connections,
          entryPointAgentId
        );
        toast.success('Workflow updated successfully');
      } else {
        const { workflowId } = await createWorkflow(
          workflowName,
          workflowDescription,
          agents,
          connections,
          entryPointAgentId
        );
        setCurrentWorkflowId(workflowId);
        toast.success('Workflow saved successfully');
        
        // Update URL to include the new workflow ID without a full page reload
        const newUrl = `/agent-builder?workflow=${workflowId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to a new workflow
  const handleNewWorkflow = () => {
    if (agents.length > 0 && !confirm('Are you sure you want to create a new workflow? Unsaved changes will be lost.')) {
      return;
    }
    
    setAgents([]);
    setConnections([]);
    setSelectedAgentId(null);
    setWorkflowName('New Workflow');
    setWorkflowDescription('');
    setCurrentWorkflowId(null);
    
    // Remove workflow ID from URL
    router.push('/agent-builder');
  };

  // Navigate to workflows page
  const handleViewWorkflows = () => {
    router.push('/agent-builder/workflows');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Agent Workflow Builder</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Build agent workflows using the OpenAI Agents SDK
            </p>
          </div>
          <div className="flex space-x-4 items-center">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
              placeholder="Workflow Name"
            />
            <input
              type="text"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 w-48 md:w-auto"
              placeholder="Description (optional)"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleNewWorkflow}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-md"
              >
                New
              </button>
              <button
                onClick={handleViewWorkflows}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-md"
              >
                My Workflows
              </button>
              <button
                onClick={handleSaveWorkflow}
                disabled={isSaving || isLoading}
                className={`px-4 py-2 rounded-md ${
                  isSaving || isLoading
                    ? 'bg-blue-400 dark:bg-blue-800 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {isSaving ? 'Saving...' : currentWorkflowId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-800/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
            <p>Loading workflow...</p>
          </div>
        </div>
      )}

      {/* Connection creation mode indicator */}
      {isCreatingConnection && (
        <div className="bg-amber-100 dark:bg-amber-900 p-2 text-center">
          <p className="text-amber-800 dark:text-amber-200">
            Select a target agent to create a connection
            <button 
              onClick={handleCancelConnection}
              className="ml-4 px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded-md"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Main content with a single DndContext wrapping both palette and canvas */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          {/* Agent palette */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
            <h2 className="text-lg font-medium mb-4">Agent Types</h2>
            <div className="space-y-3">
              {Object.values(AgentType).map((type) => (
                <AgentItem
                  key={type}
                  id={type}
                  name={AGENT_TEMPLATES[type].config!.name}
                  description={`${type.charAt(0).toUpperCase() + type.slice(1)} agent for specialized tasks`}
                />
              ))}
            </div>
            
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-4">Instructions</h2>
              <ol className="list-decimal list-inside text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <li>Drag agent types from the palette to the canvas</li>
                <li>Click on an agent to edit its properties</li>
                <li>Use the "Create Connection" button to connect agents</li>
                <li>Configure each agent's name, instructions, and tools</li>
                <li>Save your workflow when finished</li>
              </ol>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 overflow-auto">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-medium">Canvas</h2>
              <div className="space-x-2">
                {selectedAgentId && !isCreatingConnection && (
                  <button
                    onClick={() => handleStartConnection(selectedAgentId)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                  >
                    Create Connection
                  </button>
                )}
                {selectedAgentId && (
                  <button
                    onClick={() => handleAgentDelete(selectedAgentId)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                  >
                    Delete Agent
                  </button>
                )}
              </div>
            </div>
            
            <Canvas
              agents={agents}
              connections={connections}
              onAgentSelect={handleAgentSelect}
              selectedAgentId={selectedAgentId}
              isCreatingConnection={isCreatingConnection}
              onConnectionPointClick={handleConnectionPointClick}
              connectionSource={connectionSource}
              onAgentPositionChange={handleAgentPositionChange}
            />
            
            {/* Connections list */}
            {connections.length > 0 && (
              <div className="mt-4 p-3 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-950">
                <h3 className="text-md font-medium mb-2">Connections</h3>
                <ul className="space-y-2">
                  {connections.map(connection => {
                    const sourceAgent = agents.find(a => a.id === connection.sourceAgentId);
                    const targetAgent = agents.find(a => a.id === connection.targetAgentId);
                    
                    return (
                      <li key={connection.id} className="flex justify-between items-center text-sm">
                        <span>
                          {sourceAgent?.config.name} → {targetAgent?.config.name}
                        </span>
                        <button
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Properties panel */}
          <PropertiesPanel
            selectedAgent={selectedAgent}
            onAgentUpdate={handleAgentUpdate}
          />
        </div>
      </DndContext>
    </div>
  );
} 