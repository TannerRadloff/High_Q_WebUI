'use client';

import { useState } from 'react';

// Agent types available in the system with their colors and icons
const AGENT_TYPES = [
  { 
    id: 'research', 
    name: 'Research', 
    color: 'bg-blue-50 border-blue-500',
    description: 'Gathers information from various sources'
  },
  { 
    id: 'code', 
    name: 'Code', 
    color: 'bg-green-50 border-green-500',
    description: 'Writes and analyzes code'
  },
  { 
    id: 'analysis', 
    name: 'Analysis', 
    color: 'bg-purple-50 border-purple-500',
    description: 'Analyzes data and provides insights'
  },
  { 
    id: 'data', 
    name: 'Data Processing', 
    color: 'bg-yellow-50 border-yellow-500',
    description: 'Processes and transforms data'
  },
  { 
    id: 'content', 
    name: 'Content Creation', 
    color: 'bg-pink-50 border-pink-500',
    description: 'Creates reports and content'
  },
  { 
    id: 'qa', 
    name: 'QA Testing', 
    color: 'bg-orange-50 border-orange-500',
    description: 'Tests and validates outputs'
  },
  { 
    id: 'file', 
    name: 'Data', 
    color: 'bg-cyan-50 border-cyan-500',
    description: 'Handles file inputs and outputs'
  },
];

// Icons for different agent types
const AGENT_ICONS: Record<string, React.ReactNode> = {
  'Research': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  ),
  'Code': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  'Analysis': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  'Data Processing': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
      <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
      <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
    </svg>
  ),
  'Content Creation': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
  ),
  'QA Testing': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  'Data': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  ),
};

export default function NodeSelector() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredAgents = AGENT_TYPES.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, agentType: string) => {
    event.dataTransfer.setData('application/reactflow', 'agentNode');
    event.dataTransfer.setData('agentType', agentType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64">
      <h3 className="text-sm font-medium mb-2">Agent Types</h3>
      <p className="text-xs text-gray-500 mb-3">Drag and drop agents onto the canvas</p>
      
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
        />
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            draggable
            onDragStart={(event) => onDragStart(event, agent.name)}
            className={`p-2 rounded-md cursor-move border-2 shadow-sm hover:shadow-md transition-shadow ${agent.color}`}
          >
            <div className="flex items-center">
              <span className="mr-2">{AGENT_ICONS[agent.name]}</span>
              <div>
                <div className="font-medium text-sm">{agent.name} Agent</div>
                <div className="text-xs text-gray-600">{agent.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-medium mb-2">Instructions</h4>
        <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
          <li>Drag agents onto the canvas</li>
          <li>Connect agents by dragging from one node's output to another's input</li>
          <li>Click on a node to edit its properties</li>
          <li>Save your workflow when finished</li>
        </ul>
      </div>
    </div>
  );
} 