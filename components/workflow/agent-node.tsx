'use client';

import { useState, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// Agent types available in the system with their colors
const AGENT_TYPES = [
  { name: 'Research', color: 'border-blue-500 bg-blue-50' },
  { name: 'Code', color: 'border-green-500 bg-green-50' },
  { name: 'Analysis', color: 'border-purple-500 bg-purple-50' },
  { name: 'Data Processing', color: 'border-yellow-500 bg-yellow-50' },
  { name: 'Content Creation', color: 'border-pink-500 bg-pink-50' },
  { name: 'QA Testing', color: 'border-orange-500 bg-orange-50' },
  { name: 'Data', color: 'border-cyan-500 bg-cyan-50' },
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

export default function AgentNode({ data, isConnectable }: NodeProps) {
  const [agentType, setAgentType] = useState(data.agentType || AGENT_TYPES[0].name);
  const [instructions, setInstructions] = useState(data.instructions || '');
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the color class for the current agent type
  const agentStyle = useMemo(() => {
    const agentTypeObj = AGENT_TYPES.find(type => type.name === agentType);
    return agentTypeObj?.color || 'border-gray-300 bg-white';
  }, [agentType]);

  // Get the icon for the current agent type
  const agentIcon = useMemo(() => {
    return AGENT_ICONS[agentType] || null;
  }, [agentType]);

  // Update the node data when agent type changes
  const handleAgentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setAgentType(newType);
    data.agentType = newType;
    data.label = `${newType} Agent`;
  };

  // Update instructions
  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInstructions = e.target.value;
    setInstructions(newInstructions);
    data.instructions = newInstructions;
  };

  return (
    <div className={`border-2 rounded-md p-3 shadow-md min-w-[220px] ${agentStyle}`}>
      {/* Input handle at the top */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500"
      />
      
      {/* Node content */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm flex items-center">
            {agentIcon && <span className="mr-2">{agentIcon}</span>}
            {data.label}
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="mt-2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Agent Type
              </label>
              <select
                value={agentType}
                onChange={handleAgentTypeChange}
                className="w-full text-sm border border-gray-300 rounded-md p-1"
              >
                {AGENT_TYPES.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Instructions
              </label>
              <textarea
                value={instructions}
                onChange={handleInstructionsChange}
                placeholder="Enter instructions for this agent..."
                className="w-full text-sm border border-gray-300 rounded-md p-1 h-20 resize-none"
              />
            </div>
          </div>
        )}
        
        {!isExpanded && instructions && (
          <div className="mt-1 text-xs text-gray-500 truncate">
            {instructions.length > 50 ? `${instructions.substring(0, 50)}...` : instructions}
          </div>
        )}
      </div>
      
      {/* Output handle at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
} 