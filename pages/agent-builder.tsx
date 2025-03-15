'use client';

import { useState, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors,
  UniqueIdentifier
} from '@dnd-kit/core';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';

// Import custom components
import AgentItem from '../components/agents-dashboard/AgentItem';
import Canvas from '../components/agents-dashboard/Canvas';
import PropertiesPanel from '../components/agents-dashboard/PropertiesPanel';

// Import shared types
import { 
  Agent, 
  AgentType, 
  Connection, 
  AGENT_TEMPLATES,
  ModelType
} from '../components/agents-dashboard/types';

/**
 * Agent Builder Dashboard
 * 
 * A visual interface for creating OpenAI Agent workflows using a drag-and-drop interface.
 * Users can select agents, configure their properties, and connect them to create workflows.
 */
const AgentBuilder = () => {
  // State for tracking the currently dragged agent
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // State for tracking agents placed on the canvas
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // State for tracking connections between agents
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // State for the currently selected agent (for properties panel)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Derived state: Get the selected agent object
  const selectedAgent = selectedAgentId 
    ? agents.find(agent => agent.id === selectedAgentId) || null 
    : null;
  
  // Configure drag and drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Event handler for when a drag operation starts
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  }, []);

  // Event handler for when a drag operation ends
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // If the item was dropped on the canvas
    if (over && over.id === 'canvas') {
      // Generate a unique ID for the new agent
      const agentId = uuidv4();
      
      // Get the agent type from the dragged item
      const agentType = active.id.toString() as AgentType;
      
      // Get template for this agent type
      const template = AGENT_TEMPLATES[agentType];
      
      if (template) {
        // Add a new agent to the canvas
        const newAgent: Agent = {
          id: agentId,
          type: agentType,
          position: {
            x: over.rect ? (over.rect.left + 50) : 100,
            y: over.rect ? (over.rect.top + 50) : 100,
          },
          config: {
            name: template.config?.name || `${agentType} Agent`,
            instructions: template.config?.instructions || '',
            model: template.config?.model || ModelType.GPT_4,
            tools: template.config?.tools || []
          }
        };
        
        setAgents((prevAgents) => [...prevAgents, newAgent]);
        
        // Select the newly added agent
        setSelectedAgentId(agentId);
      }
    }
    
    setActiveId(null);
  }, []);
  
  // Handler for updating agent properties
  const handleAgentUpdate = useCallback((updatedAgent: Agent) => {
    setAgents((prevAgents) => 
      prevAgents.map((agent) => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      )
    );
  }, []);
  
  // Handler for selecting an agent
  const handleAgentSelect = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);
  }, []);

  // Handler for saving the workflow
  const handleSaveWorkflow = useCallback(() => {
    const workflow = {
      id: uuidv4(),
      name: 'My Workflow',
      description: 'A workflow created with the agent builder',
      agents,
      connections,
      entryPointAgentId: agents.length > 0 ? agents[0].id : '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to localStorage for now
    localStorage.setItem('savedWorkflow', JSON.stringify(workflow));
    
    // In a real app, you would save this to a database
    console.log('Workflow saved:', workflow);
    
    // Show a success message
    alert('Workflow saved successfully!');
  }, [agents, connections]);

  return (
    <>
      <Head>
        <title>Agent Builder Dashboard | Mimir</title>
        <meta name="description" content="Build AI agent workflows with a visual interface" />
      </Head>
      
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Agent Builder</h1>
          <div className="flex gap-2">
            <button 
              onClick={handleSaveWorkflow}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Workflow
            </button>
            <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Test Workflow
            </button>
          </div>
        </header>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with available agents */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
            <h2 className="text-lg font-medium mb-4">Available Agents</h2>
            <div className="space-y-2">
              {/* Agent options */}
              <AgentItem 
                id={AgentType.RESEARCH} 
                name="Research Agent" 
                description="Find information and answer factual questions" 
              />
              
              <AgentItem 
                id={AgentType.REPORT} 
                name="Report Agent" 
                description="Create structured reports and summaries" 
              />
              
              <AgentItem 
                id={AgentType.JUDGE} 
                name="Judge Agent" 
                description="Evaluate options and make decisions" 
              />
              
              <AgentItem 
                id={AgentType.CODING} 
                name="Coding Agent" 
                description="Write and review code" 
              />
              
              <AgentItem 
                id={AgentType.CREATIVE} 
                name="Creative Agent" 
                description="Generate creative content and ideas" 
              />
            </div>
          </div>
          
          {/* Main canvas area */}
          <div className="flex-1 p-4 relative">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Canvas 
                agents={agents} 
                onAgentSelect={handleAgentSelect} 
                selectedAgentId={selectedAgentId} 
              />
            </DndContext>
          </div>
          
          {/* Properties panel */}
          <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
            <PropertiesPanel 
              selectedAgent={selectedAgent} 
              onAgentUpdate={handleAgentUpdate} 
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AgentBuilder; 