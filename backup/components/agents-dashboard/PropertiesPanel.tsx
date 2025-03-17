import React, { useState } from 'react';
import { Agent, ModelType, AgentTool, AGENT_ICONS, AgentType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface PropertiesPanelProps {
  selectedAgent: Agent | null;
  onAgentUpdate: (agent: Agent) => void;
}

/**
 * PropertiesPanel - A component for editing agent properties
 * Displays editable fields when an agent is selected
 */
const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedAgent, 
  onAgentUpdate 
}) => {
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [newToolDescription, setNewToolDescription] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [showSpecializationField, setShowSpecializationField] = useState(false);

  if (!selectedAgent) {
    return (
      <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
        <h2 className="text-lg font-medium mb-4">Properties</h2>
        <div className="space-y-4">
          <p className="text-slate-500 dark:text-slate-400">
            Select an agent to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (
    field: string, 
    value: string | ModelType
  ) => {
    const updatedAgent = {
      ...selectedAgent,
      config: {
        ...selectedAgent.config,
        [field]: value
      }
    };
    onAgentUpdate(updatedAgent);
  };

  const handleAddTool = () => {
    if (newToolName.trim() === '') return;

    const newTool: AgentTool = {
      id: uuidv4(),
      name: newToolName,
      description: newToolDescription,
      parameters: []
    };

    const updatedAgent = {
      ...selectedAgent,
      config: {
        ...selectedAgent.config,
        tools: [...selectedAgent.config.tools, newTool]
      }
    };

    onAgentUpdate(updatedAgent);
    setNewToolName('');
    setNewToolDescription('');
    setIsAddingTool(false);
  };

  const handleRemoveTool = (toolId: string) => {
    const updatedAgent = {
      ...selectedAgent,
      config: {
        ...selectedAgent.config,
        tools: selectedAgent.config.tools.filter(tool => tool.id !== toolId)
      }
    };
    onAgentUpdate(updatedAgent);
  };

  // Handle saving agent configuration
  const handleSaveAgentConfig = async () => {
    if (!specialization && showSpecializationField) {
      toast.error('Please provide a specialization for this agent');
      return;
    }

    try {
      setIsSavingConfig(true);

      const response = await fetch('/api/agent-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedAgent.config.name,
          type: selectedAgent.type,
          instructions: selectedAgent.config.instructions,
          model: selectedAgent.config.model,
          tools: selectedAgent.config.tools,
          icon: selectedAgent.config.icon || AGENT_ICONS[selectedAgent.type as AgentType] || '🤖',
          specialization: specialization || `Customized ${selectedAgent.type} agent`
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Agent configuration saved successfully');
        setShowSpecializationField(false);
        setSpecialization('');
      } else {
        toast.error(data.error || 'Failed to save agent configuration');
      }
    } catch (error) {
      console.error('Error saving agent configuration:', error);
      toast.error('An error occurred while saving the agent configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Agent Properties</h2>
        <button
          onClick={() => setShowSpecializationField(true)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
        >
          Save Agent
        </button>
      </div>
      
      {showSpecializationField && (
        <div className="mb-4 p-3 border border-blue-200 dark:border-blue-800 rounded-md bg-blue-50 dark:bg-blue-900/20">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Agent Specialization
          </label>
          <input 
            type="text" 
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="E.g., 'Financial Research', 'Technical Writing'"
            className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md 
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-2"
          />
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setShowSpecializationField(false)}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md
                       hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveAgentConfig}
              disabled={isSavingConfig}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs disabled:bg-blue-400"
            >
              {isSavingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Name
          </label>
          <input 
            type="text" 
            value={selectedAgent.config.name} 
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md 
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>
        
        {/* Type field (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Type
          </label>
          <input 
            type="text" 
            value={`${selectedAgent.type} Agent`}
            readOnly
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md 
                     bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          />
        </div>
        
        {/* Model selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Model
          </label>
          <select 
            value={selectedAgent.config.model} 
            onChange={(e) => handleChange('model', e.target.value as ModelType)}
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md 
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            <option value={ModelType.GPT_3_5_TURBO}>GPT-3.5 Turbo</option>
            <option value={ModelType.GPT_4}>GPT-4</option>
            <option value={ModelType.GPT_4_TURBO}>GPT-4 Turbo</option>
            <option value={ModelType.GPT_4O}>GPT-4o</option>
            <option value={ModelType.CLAUDE_3_OPUS}>Claude 3 Opus</option>
            <option value={ModelType.CLAUDE_3_SONNET}>Claude 3 Sonnet</option>
            <option value={ModelType.CLAUDE_3_HAIKU}>Claude 3 Haiku</option>
          </select>
        </div>
        
        {/* Instructions field */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Instructions
          </label>
          <textarea 
            value={selectedAgent.config.instructions} 
            onChange={(e) => handleChange('instructions', e.target.value)}
            rows={5}
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md 
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>
        
        {/* Tools section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Tools</h3>
            <button 
              onClick={() => setIsAddingTool(true)}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Tool
            </button>
          </div>
          
          {/* List of tools */}
          <div className="space-y-2">
            {selectedAgent.config.tools.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No tools added</p>
            ) : (
              selectedAgent.config.tools.map(tool => (
                <div 
                  key={tool.id} 
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm">{tool.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tool.description}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveTool(tool.id)}
                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Add tool form */}
          {isAddingTool && (
            <div className="mt-2 p-3 border border-blue-200 dark:border-blue-800 rounded-md bg-blue-50 dark:bg-blue-900/20">
              <h4 className="font-medium text-sm mb-2">Add New Tool</h4>
              
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Tool Name"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md 
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                
                <textarea 
                  placeholder="Tool Description"
                  value={newToolDescription}
                  onChange={(e) => setNewToolDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md 
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsAddingTool(false)}
                    className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md 
                             hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddTool}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel; 