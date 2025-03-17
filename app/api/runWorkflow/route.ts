import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { 
  ResearchAgent, 
  CodingAgent, 
  DataAnalysisAgent, 
  WritingAgent,
  MimirAgent,
  runAgent 
} from '@/lib/agents';

// Initialize all agents
const researchAgent = new ResearchAgent();
const codingAgent = new CodingAgent();
const dataAnalysisAgent = new DataAnalysisAgent();
const writingAgent = new WritingAgent();
const mimirAgent = new MimirAgent();

// Map to easily access agents by type
const agentMap = {
  'ResearchAgent': researchAgent,
  'CodingAgent': codingAgent,
  'DataAnalysisAgent': dataAnalysisAgent,
  'WritingAgent': writingAgent,
  'MimirAgent': mimirAgent
};

export async function POST(request: NextRequest) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { workflowId, input = '' } = body;
    
    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the workflow from the database
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();
    
    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found', details: workflowError },
        { status: 404 }
      );
    }

    // Parse the workflow graph
    const { nodes, edges } = workflow;
    
    // Validate graph structure
    if (!nodes || !edges || !Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Invalid workflow structure' },
        { status: 400 }
      );
    }

    // Create a task execution record
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        status: 'in_progress',
        input: typeof input === 'string' ? input : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: 'Failed to create task record', details: taskError },
        { status: 500 }
      );
    }

    // Execute the workflow
    // Make sure input is always a string to satisfy TypeScript
    const inputString = typeof input === 'string' ? input : '';
    const result = await executeWorkflow(nodes, edges, inputString, userId, task.id);
    
    // Update the task with the result
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        result: result,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);
    
    if (updateError) {
      console.error('Error updating task record:', updateError);
    }
    
    return NextResponse.json({
      workflowId,
      taskId: task.id,
      status: 'completed',
      result,
      steps: await getWorkflowSteps(task.id) // Include all steps for the UI
    });
    
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow', details: error },
      { status: 500 }
    );
  }
}

/**
 * Execute a workflow by processing nodes in topological order
 * @param nodes Workflow nodes
 * @param edges Connections between nodes
 * @param input Initial input for the workflow
 * @param userId User ID for context
 * @param taskId Task ID for tracking
 * @returns The final result of the workflow
 */
async function executeWorkflow(
  nodes: any[],
  edges: any[],
  input: string,
  userId: string,
  taskId: string
) {
  try {
    // Input is already guaranteed to be a string by the caller
    let inputStr = input;
    
    // Determine node execution order using topological sort
    const executionOrder = topologicalSort(nodes, edges);
    
    // Map to store intermediate results
    const nodeResults: Record<string, any> = {};
    
    // Context for agents
    const context = { userId, taskId };
    
    // Final result to return
    let finalResult: any = null;
    
    // Process each node in order
    for (const nodeId of executionOrder) {
      // Check if the workflow execution has been requested to stop
      const { data: taskData } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();
      
      // If the task has been cancelled or paused, stop execution
      if (taskData && ['cancelled', 'paused'].includes(taskData.status)) {
        return {
          content: `Workflow execution was ${taskData.status} by user request`,
          status: taskData.status,
          completed: false
        };
      }
      
      // Check if there are any user instructions to modify the next steps
      const { data: userInstructions } = await supabase
        .from('task_instructions')
        .select('*')
        .eq('task_id', taskId)
        .eq('applied', false)
        .order('created_at', { ascending: true });
      
      // Apply any user instructions to the input
      if (userInstructions && userInstructions.length > 0) {
        const instruction = userInstructions[0];
        inputStr += `\n\nAdditional user instruction: ${instruction.content}`;
        
        // Mark instruction as applied
        await supabase
          .from('task_instructions')
          .update({ applied: true })
          .eq('id', instruction.id);
      }
      
      const node = nodes.find(n => n.id === nodeId);
      
      if (!node) {
        console.error(`Node ${nodeId} not found`);
        continue;
      }
      
      // Get input for this node
      let nodeInput = inputStr; // Default to workflow input
      
      // If this node has incoming edges, use output from previous node
      const incomingEdges = edges.filter(e => e.target === nodeId);
      if (incomingEdges.length > 0) {
        const sourceNodeId = incomingEdges[0].source;
        if (nodeResults[sourceNodeId]) {
          nodeInput = nodeResults[sourceNodeId].content || nodeResults[sourceNodeId];
        }
      }
      
      // Execute the node based on its type
      let result: any;
      
      // Record node execution start
      await supabase
        .from('task_steps')
        .insert({
          task_id: taskId,
          node_id: nodeId,
          status: 'in_progress',
          input: nodeInput,
          created_at: new Date().toISOString()
        });
      
      if (node.type === 'agent') {
        // Execute agent node
        const agentType = node.data?.agentType as keyof typeof agentMap;
        const agent = agentType && agentMap[agentType];
        
        if (agent) {
          result = await runAgent(agent, nodeInput, context);
        } else {
          result = {
            content: `Error: Agent type "${agentType}" not found`,
            error: true
          };
        }
      } else if (node.type === 'input') {
        // Input node just passes through
        result = { content: nodeInput };
      } else if (node.type === 'output') {
        // Output node
        result = { content: nodeInput };
        finalResult = result; // Save this as the final output
      } else {
        // Unknown node type
        result = {
          content: `Error: Unknown node type "${node.type}"`,
          error: true
        };
      }
      
      // Store the result
      nodeResults[nodeId] = result;
      
      // Record node execution completion
      await supabase
        .from('task_steps')
        .update({
          status: 'completed',
          output: result.content,
          completed_at: new Date().toISOString()
        })
        .eq('task_id', taskId)
        .eq('node_id', nodeId);
    }
    
    return finalResult || { content: "Workflow completed but no output node was found" };
  } catch (error) {
    console.error('Error in workflow execution:', error);
    throw error;
  }
}

/**
 * Perform a topological sort on the graph to determine execution order
 * @param nodes Workflow nodes
 * @param edges Connections between nodes
 * @returns Array of node IDs in execution order
 */
function topologicalSort(nodes: any[], edges: any[]): string[] {
  // Build adjacency list
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  // Initialize
  for (const node of nodes) {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  }
  
  // Add edges
  for (const edge of edges) {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  }
  
  // Find nodes with no dependencies (in-degree = 0)
  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }
  
  // Process queue
  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    
    for (const neighbor of graph[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  // Check for cycles
  if (result.length !== nodes.length) {
    console.warn('The workflow graph has cycles, some nodes may not be executed');
  }
  
  return result;
}

/**
 * Get all execution steps for a workflow task
 * @param taskId Task ID to retrieve steps for
 * @returns Array of task steps with their execution details
 */
async function getWorkflowSteps(taskId: string) {
  const { data: steps } = await supabase
    .from('task_steps')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  return steps || [];
} 