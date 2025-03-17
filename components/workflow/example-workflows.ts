import { Node, Edge } from 'reactflow';

// Example workflow for patent analysis
export const patentAnalysisWorkflow = {
  name: 'Patent Claims Analysis',
  nodes: [
    {
      id: 'node_1',
      type: 'agentNode',
      position: { x: 250, y: 50 },
      data: {
        label: 'File Input',
        agentType: 'Data',
        instructions: 'Upload an Excel file containing patent claims to be analyzed.'
      }
    },
    {
      id: 'node_2',
      type: 'agentNode',
      position: { x: 250, y: 200 },
      data: {
        label: 'Parsing Agent',
        agentType: 'Code',
        instructions: 'Parse the Excel file to extract all patent claims. Output a structured list of claims with their identifiers.'
      }
    },
    {
      id: 'node_3',
      type: 'agentNode',
      position: { x: 250, y: 350 },
      data: {
        label: 'Relevance Agent',
        agentType: 'Analysis',
        instructions: 'Analyze each claim for relevance to our company\'s technology focus areas. Flag claims that might be relevant to our products or R&D.'
      }
    },
    {
      id: 'node_4',
      type: 'agentNode',
      position: { x: 250, y: 500 },
      data: {
        label: 'Results Summary',
        agentType: 'Content Creation',
        instructions: 'Create a summary report of all relevant patent claims, including potential impact on our business and recommended actions.'
      }
    }
  ] as Node[],
  edges: [
    {
      id: 'edge_1-2',
      source: 'node_1',
      target: 'node_2',
      type: 'default'
    },
    {
      id: 'edge_2-3',
      source: 'node_2',
      target: 'node_3',
      type: 'default'
    },
    {
      id: 'edge_3-4',
      source: 'node_3',
      target: 'node_4',
      type: 'default'
    }
  ] as Edge[]
};

// Example workflow for market research
export const marketResearchWorkflow = {
  name: 'Market Research Analysis',
  nodes: [
    {
      id: 'node_1',
      type: 'agentNode',
      position: { x: 250, y: 50 },
      data: {
        label: 'Data Collection',
        agentType: 'Research',
        instructions: 'Gather market data from specified sources and compile into a structured format.'
      }
    },
    {
      id: 'node_2',
      type: 'agentNode',
      position: { x: 250, y: 200 },
      data: {
        label: 'Data Processing',
        agentType: 'Data Processing',
        instructions: 'Clean and process the collected data, removing outliers and formatting for analysis.'
      }
    },
    {
      id: 'node_3',
      type: 'agentNode',
      position: { x: 250, y: 350 },
      data: {
        label: 'Trend Analysis',
        agentType: 'Analysis',
        instructions: 'Identify key market trends and patterns from the processed data.'
      }
    },
    {
      id: 'node_4',
      type: 'agentNode',
      position: { x: 250, y: 500 },
      data: {
        label: 'Report Generation',
        agentType: 'Content Creation',
        instructions: 'Create a comprehensive market analysis report with visualizations and actionable insights.'
      }
    }
  ] as Node[],
  edges: [
    {
      id: 'edge_1-2',
      source: 'node_1',
      target: 'node_2',
      type: 'default'
    },
    {
      id: 'edge_2-3',
      source: 'node_2',
      target: 'node_3',
      type: 'default'
    },
    {
      id: 'edge_3-4',
      source: 'node_3',
      target: 'node_4',
      type: 'default'
    }
  ] as Edge[]
};

// List of all example workflows
export const exampleWorkflows = [
  patentAnalysisWorkflow,
  marketResearchWorkflow
]; 