'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  Connection,
  Edge,
  Node,
  NodeTypes,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './workflow.css';

import AgentNode from './agent-node';
import NodeSelector from './node-selector';
import { patentAnalysisWorkflow, exampleWorkflows } from './example-workflows';
import { useWorkflow } from '@/contexts/workflow-context';
import { useUser } from '@/contexts/user-context';

// Define custom node types
const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
};

// Initial nodes and edges
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function WorkflowBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasLoadedExample, setHasLoadedExample] = useState(false);
  const [selectedExample, setSelectedExample] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<Record<string, string>>({});

  const { user } = useUser();
  const { 
    workflows,
    activeWorkflowId,
    setActiveWorkflowId, 
    saveCurrentWorkflow, 
    createWorkflow 
  } = useWorkflow();

  // Load workflow from context or default to example
  useEffect(() => {
    if (!hasLoadedExample) {
      if (activeWorkflowId) {
        // Load the active workflow
        const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
        if (activeWorkflow) {
          setWorkflowName(activeWorkflow.name);
          setNodes(activeWorkflow.graph.nodes);
          setEdges(activeWorkflow.graph.edges);
          setHasLoadedExample(true);
          return;
        }
      }

      // If no active workflow, load the default example
      const exampleWorkflow = patentAnalysisWorkflow;
      setWorkflowName(exampleWorkflow.name);
      setNodes(exampleWorkflow.nodes);
      setEdges(exampleWorkflow.edges);
      setHasLoadedExample(true);
    }
  }, [hasLoadedExample, activeWorkflowId, workflows, setNodes, setEdges]);

  // Handle connections between nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle dropping a new node onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      const agentType = event.dataTransfer.getData('agentType');
      
      // Check if the dropped element is valid
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create a new node
      const newNode: Node = {
        id: `node_${nodes.length + 1}`,
        type: 'agentNode',
        position,
        data: { label: `${agentType} Agent`, agentType },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const saveWorkflow = async () => {
    if (!user) {
      alert('Please sign in to save workflows');
      return;
    }

    setIsSaving(true);
    try {
      const result = activeWorkflowId 
        ? await saveCurrentWorkflow(workflowName, nodes, edges)
        : await createWorkflow(workflowName, nodes, edges);
      
      if (result.success) {
        alert('Workflow saved successfully!');
      } else {
        alert('Error saving workflow. Please try again.');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportWorkflow = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    
    // Create a JSON blob and download it
    const jsonString = JSON.stringify(workflow, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importWorkflow = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        if (jsonData.nodes && jsonData.edges && jsonData.name) {
          setWorkflowName(jsonData.name);
          setNodes(jsonData.nodes);
          setEdges(jsonData.edges);
          alert('Workflow imported successfully!');
        } else {
          alert('Invalid workflow file format.');
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error importing workflow. Invalid JSON format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const loadExampleWorkflow = (index: number) => {
    if (index >= 0 && index < exampleWorkflows.length) {
      const example = exampleWorkflows[index];
      setWorkflowName(example.name);
      setNodes(example.nodes);
      setEdges(example.edges);
      setSelectedExample(index);
      setActiveWorkflowId(null); // Clear active workflow when loading an example
    }
  };

  const resetWorkflow = () => {
    if (confirm('Are you sure you want to clear the current workflow?')) {
      setWorkflowName('New Workflow');
      setNodes([]);
      setEdges([]);
      setActiveWorkflowId(null);
    }
  };

  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add nodes to your workflow before executing.');
      return;
    }

    setIsExecuting(true);
    setExecutionStatus({});

    try {
      // This is a simulated execution
      // In a real app, you would send the workflow to a backend service
      
      // Get topologically sorted nodes (assume the workflow is a DAG)
      const sortedNodes = [...nodes].sort((a, b) => {
        const aPos = a.position.y;
        const bPos = b.position.y;
        return aPos - bPos;
      });

      // Execute each node in sequence
      for (const node of sortedNodes) {
        setExecutionStatus(prev => ({
          ...prev,
          [node.id]: 'running'
        }));

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update node with result
        setExecutionStatus(prev => ({
          ...prev,
          [node.id]: 'completed'
        }));
      }

      alert('Workflow execution completed successfully!');
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Error executing workflow. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Highlight nodes based on execution status
  useEffect(() => {
    if (Object.keys(executionStatus).length > 0) {
      setNodes(nodes => nodes.map(node => {
        const status = executionStatus[node.id];
        let className = '';
        
        if (status === 'running') {
          className = 'executing';
        } else if (status === 'completed') {
          className = 'executed';
        }
        
        return {
          ...node,
          className
        };
      }));
    }
  }, [executionStatus, setNodes]);

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <div className="h-full w-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable 
              pannable
            />
            <Panel position="top-left" className="bg-white p-4 rounded-md shadow-md">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="workflow-name" className="block text-sm font-medium text-gray-700">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    id="workflow-name"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveWorkflow}
                    disabled={isSaving}
                    className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSaving ? 'Saving...' : 'Save Workflow'}
                  </button>
                  <button
                    onClick={exportWorkflow}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Export JSON
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={importWorkflow}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Import Workflow
                  </button>
                  <button
                    onClick={resetWorkflow}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Clear Workflow
                  </button>
                </div>
                <button
                  onClick={executeWorkflow}
                  disabled={isExecuting || nodes.length === 0}
                  className={`px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isExecuting ? 'Executing...' : 'Execute Workflow'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {workflows.length > 0 && (
                  <div className="mt-2 border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Saved Workflows
                    </label>
                    <div className="space-y-2">
                      {workflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          onClick={() => {
                            if (workflow.id) {
                              setActiveWorkflowId(workflow.id);
                              setWorkflowName(workflow.name);
                              setNodes(workflow.graph.nodes);
                              setEdges(workflow.graph.edges);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                            activeWorkflowId === workflow.id
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {workflow.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Example Workflows
                  </label>
                  <div className="space-y-2">
                    {exampleWorkflows.map((workflow, index) => (
                      <button
                        key={index}
                        onClick={() => loadExampleWorkflow(index)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                          selectedExample === index && !activeWorkflowId
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {workflow.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
            <Panel position="top-right" className="bg-white p-4 rounded-md shadow-md">
              <NodeSelector />
            </Panel>
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
} 