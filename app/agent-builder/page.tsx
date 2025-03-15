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
import { Agent, AgentType, AGENT_TEMPLATES, Connection, ModelType, SavedAgentConfig, BASE_AGENT_TEMPLATE } from '@/components/agents-dashboard/types';

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
  const [workflowName, setWorkflowName] = useState('Research Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('An example workflow for delegating research tasks');
  
  // State for connection creation
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  
  // State for workflow management
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for saved agent configurations
  const [savedAgentConfigs, setSavedAgentConfigs] = useState<SavedAgentConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId) || null;

  // Load workflow if workflow ID is provided in URL
  useEffect(() => {
    const workflowId = searchParams?.get('workflow');
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      // Create example agents workflow
      createExampleWorkflow();
    }
    
    // Fetch saved agent configurations
    fetchSavedAgentConfigurations();
  }, [searchParams]);

  // Fetch saved agent configurations
  const fetchSavedAgentConfigurations = async () => {
    try {
      setIsLoadingConfigs(true);
      
      const response = await fetch('/api/agent-config');
      const data = await response.json();
      
      if (data.configurations) {
        setSavedAgentConfigs(data.configurations);
      }
    } catch (error) {
      console.error('Error fetching agent configurations:', error);
      toast.error('Failed to load saved agent configurations');
    } finally {
      setIsLoadingConfigs(false);
    }
  };

  // Create an example workflow with delegation, research, and report writing agents
  const createExampleWorkflow = () => {
    // Create IDs for the agents
    const delegatorId = uuidv4();
    const researcherId = uuidv4();
    const reportWriterId = uuidv4();
    
    // Create the agents
    const delegator: Agent = {
      id: delegatorId,
      type: AgentType.DELEGATE,
      position: { x: 100, y: 100 },
      config: {
        name: 'Delegation Agent',
        instructions: 'You are the primary delegation agent responsible for receiving user queries and directing them to the appropriate specialist agents. For research tasks, first understand what the user is asking for, then delegate to the Research Agent. Monitor the workflow and ensure tasks are properly handed off between agents.',
        model: ModelType.GPT_4O,
        tools: [],
        icon: '👨‍💼'
      }
    };
    
    const researcher: Agent = {
      id: researcherId,
      type: AgentType.RESEARCH,
      position: { x: 400, y: 60 },
      config: {
        name: 'Research Agent',
        instructions: 'As a specialized research agent, your role is to collect comprehensive information on topics delegated to you. Utilize search tools to find accurate, up-to-date information from reliable sources. Format your findings clearly, including citations and references. When research is complete, hand off your findings to the Report Writer Agent.',
        model: ModelType.GPT_4O,
        tools: [],
        icon: '🔍'
      }
    };
    
    const reportWriter: Agent = {
      id: reportWriterId,
      type: AgentType.REPORT,
      position: { x: 700, y: 100 },
      config: {
        name: 'Report Writer Agent',
        instructions: 'You are a specialized report writing agent. Your role is to take research data handed to you by the Research Agent and transform it into well-structured, professional reports. Organize information logically, highlight key findings, and ensure the report is easy to understand. Present the final report back to the user in a clear, readable format.',
        model: ModelType.GPT_4O,
        tools: [],
        icon: '📊'
      }
    };
    
    // Create connections between agents
    const delegatorToResearcher: Connection = {
      id: uuidv4(),
      sourceAgentId: delegatorId,
      targetAgentId: researcherId,
      label: 'Research Request'
    };
    
    const researcherToReportWriter: Connection = {
      id: uuidv4(),
      sourceAgentId: researcherId,
      targetAgentId: reportWriterId,
      label: 'Research Data'
    };
    
    // Update state
    setAgents([delegator, researcher, reportWriter]);
    setConnections([delegatorToResearcher, researcherToReportWriter]);
    
    // Set default selected agent
    setSelectedAgentId(delegatorId);
  };

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
      // Check if this is a saved agent configuration or a template
      const agentId = active.id as string;
      
      // Check if it's a saved agent config (format: "saved-{configId}")
      if (agentId.startsWith('saved-')) {
        const configId = agentId.replace('saved-', '');
        const savedConfig = savedAgentConfigs.find(config => config.id === configId);
        
        if (savedConfig) {
          // Create a new agent from the saved config
          const newAgent: Agent = {
            id: uuidv4(),
            type: savedConfig.type,
            position: {
              x: Math.round((Math.random() * 400 + 50) / 20) * 20, // Random position, snapped to grid
              y: Math.round((Math.random() * 300 + 50) / 20) * 20,
            },
            config: {
              name: savedConfig.name,
              instructions: savedConfig.instructions,
              model: savedConfig.model,
              tools: savedConfig.tools,
              icon: savedConfig.icon,
              specialization: savedConfig.specialization,
              isCustom: true
            }
          };
          
          // Add the new agent to the state
          setAgents(prevAgents => [...prevAgents, newAgent]);
          
          // Select the newly created agent
          setSelectedAgentId(newAgent.id);
          return;
        }
      }
      
      // Regular agent type handling
      const agentType = active.id as AgentType;
      
      // Create a new agent with default position
      const newAgent: Agent = {
        id: uuidv4(),
        type: agentType,
        position: {
          x: Math.round((Math.random() * 400 + 50) / 20) * 20, // Random position, snapped to grid
          y: Math.round((Math.random() * 300 + 50) / 20) * 20,
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

  // Handle saving the workflow
  const handleSaveWorkflow = async () => {
    try {
      setIsSaving(true);
      
      // Create the workflow object with all necessary fields
      const workflow = {
        name: workflowName,
        description: workflowDescription,
        agents,
        connections,
        entryPointAgentId: agents.length > 0 ? agents[0].id : ''
      };
      
      if (currentWorkflowId) {
        await updateWorkflow(
          currentWorkflowId,
          workflowName,
          workflowDescription,
          agents,
          connections,
          agents.length > 0 ? agents[0].id : ''
        );
        toast.success('Workflow updated successfully');
      } else {
        const result = await createWorkflow(
          workflowName,
          workflowDescription,
          agents,
          connections,
          agents.length > 0 ? agents[0].id : ''
        );
        setCurrentWorkflowId(result.workflowId);
        toast.success('Workflow created successfully');
        
        // Update the URL with the new workflow ID
        router.push(`?workflow=${result.workflowId}`);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 h-screen max-h-screen flex flex-col">
      {/* Workflow header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-baseline gap-4">
            <h1 className="text-2xl font-bold">Agent Builder</h1>
            <div className="flex-1">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="px-2 py-1 border-b border-slate-300 dark:border-slate-700 bg-transparent focus:border-blue-500 dark:focus:border-blue-400 outline-none text-lg font-medium"
                placeholder="Workflow Name"
              />
            </div>
          </div>
          <input
            type="text"
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            className="mt-1 px-2 py-1 border-b border-slate-200 dark:border-slate-800 bg-transparent focus:border-blue-500 dark:focus:border-blue-400 outline-none w-full text-slate-600 dark:text-slate-400"
            placeholder="Workflow Description"
          />
        </div>
        <button
          onClick={handleSaveWorkflow}
          disabled={isSaving || isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-md"
        >
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      {/* Connection creation notification */}
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
              {/* Base agent as first option */}
              <AgentItem
                key={AgentType.BASE}
                id={AgentType.BASE}
                name={BASE_AGENT_TEMPLATE.config!.name}
                description="Base agent that can be customized for any purpose"
                icon={BASE_AGENT_TEMPLATE.config!.icon}
              />
              
              {/* Other agent types */}
              {Object.values(AgentType)
                .filter(type => type !== AgentType.BASE) // Filter out the base agent
                .map((type) => (
                  <AgentItem
                    key={type}
                    id={type}
                    name={AGENT_TEMPLATES[type].config!.name}
                    description={`${type.charAt(0).toUpperCase() + type.slice(1)} agent for specialized tasks`}
                    icon={AGENT_TEMPLATES[type].config!.icon}
                  />
              ))}
            </div>
            
            {/* Saved agent configurations */}
            {savedAgentConfigs.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-medium mb-3">Saved Agents</h2>
                <div className="space-y-3">
                  {savedAgentConfigs.map((config) => (
                    <AgentItem
                      key={`saved-${config.id}`}
                      id={`saved-${config.id}`}
                      name={config.name}
                      description={config.specialization}
                      icon={config.icon}
                      isCustom={true}
                      specialization={config.specialization}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {isLoadingConfigs && (
              <div className="mt-4 flex justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
            
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-4">Instructions</h2>
              <ol className="list-decimal list-inside text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <li>Drag agent types from the palette to the canvas</li>
                <li>Click on an agent to edit its properties</li>
                <li>Use the "Create Connection" button to connect agents</li>
                <li>Alternatively, click on connection nodes to create connections directly</li>
                <li>Agents can be positioned along the grid</li>
                <li>Configure each agent's name, instructions, and tools</li>
                <li>Save custom agents to reuse them in other workflows</li>
                <li>Save your workflow when finished</li>
              </ol>
            </div>
          </div>

          {/* Canvas and properties panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Canvas toolbar */}
            <div className="flex-grow p-4 flex flex-col">
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
            </div>
            
            {/* Properties panel */}
            {selectedAgent && (
              <div className="h-1/3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
                <PropertiesPanel 
                  selectedAgent={selectedAgent} 
                  onAgentUpdate={handleAgentUpdate} 
                />
              </div>
            )}
            
            {/* Connections list */}
            {!selectedAgent && connections.length > 0 && (
              <div className="h-1/3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
                <h2 className="text-lg font-medium mb-4">Connections</h2>
                <div className="space-y-2">
                  {connections.map(connection => {
                    const sourceAgent = agents.find(a => a.id === connection.sourceAgentId);
                    const targetAgent = agents.find(a => a.id === connection.targetAgentId);
                    
                    if (!sourceAgent || !targetAgent) return null;
                    
                    return (
                      <div 
                        key={connection.id} 
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-md flex justify-between items-center"
                      >
                        <div>
                          <span className="font-medium">{sourceAgent.config.name}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{targetAgent.config.name}</span>
                          <span className="ml-2 text-sm text-slate-500">({connection.label})</span>
                        </div>
                        <button
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
} 