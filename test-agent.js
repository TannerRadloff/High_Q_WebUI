// Simple test script for testing the Mimir agent with a single prompt
// This script can be run directly with Node.js: node test-agent.js

// Import OpenAI and dotenv
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// Define model constants
const HIGH_QUALITY_MODEL = 'gpt-4';
const COST_EFFICIENT_MODEL = 'gpt-3.5-turbo';

// Define system instructions
const MIMIR_INSTRUCTION = `You are Mimir, an AI assistant with the ability to delegate tasks to specialist agents. 
If a question requires specific expertise or a multi-step solution, you should delegate to the appropriate specialist agent.
Otherwise, answer directly with your knowledge.

Your available specialist agents are:
1. Research Agent - Expert at finding information on any topic
2. Coding Agent - Expert at writing and explaining code
3. Data Analysis Agent - Expert at analyzing and visualizing data
4. Writing Agent - Expert at creating and improving written content

When deciding whether to delegate:
- For factual questions, research needs, or information gathering, use the Research Agent
- For code writing, debugging, or programming explanations, use the Coding Agent
- For data analysis, statistics, or visualization tasks, use the Data Analysis Agent
- For content creation, editing, or writing assistance, use the Writing Agent

Always prioritize giving the user the most helpful and accurate response. If a query spans multiple domains, choose the agent that covers the primary need.`;

// Initialize OpenAI client (you'll need to set OPENAI_API_KEY environment variable)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the test prompt
const TEST_PROMPT = "I want to buy a car, what should I do?";

// Define the function tools for delegation
const tools = [
  {
    type: 'function',
    function: {
      name: 'research_task',
      description: 'Use this function when the user query requires research, information gathering, or answering factual questions.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to be processed by the Research Agent'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'coding_task',
      description: 'Use this function when the user query involves writing code, debugging, or explaining programming concepts.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to be processed by the Coding Agent'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'data_analysis_task',
      description: 'Use this function when the user query involves analyzing data, statistics, or creating visualizations.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to be processed by the Data Analysis Agent'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'writing_task',
      description: 'Use this function when the user query involves writing, editing, or improving text content.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to be processed by the Writing Agent'
          }
        },
        required: ['query']
      }
    }
  }
];

// Function to test the agent
async function testAgent() {
  console.log('🧪 Testing Mimir Agent with prompt:', TEST_PROMPT);
  
  try {
    // Call the OpenAI API with function calling enabled
    const response = await openai.chat.completions.create({
      model: HIGH_QUALITY_MODEL,
      messages: [
        {
          role: 'system',
          content: `${MIMIR_INSTRUCTION}

For complex queries, you should determine which specialized agent would be best suited to handle it.
You have access to the following functions:
- research_task: For queries requiring research or factual information
- coding_task: For queries involving code or programming
- data_analysis_task: For queries involving data analysis or visualization
- writing_task: For queries involving writing or content creation

If you can handle the query directly, do so. Otherwise, call the appropriate function.`
        },
        {
          role: 'user',
          content: TEST_PROMPT
        }
      ],
      tools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;
    
    console.log('\n📊 Results:');
    console.log('Model Used:', HIGH_QUALITY_MODEL);
    
    // Check if the model wants to use a tool (delegate to a specialized agent)
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const toolName = toolCall.function.name;
      const params = JSON.parse(toolCall.function.arguments);
      
      console.log('Decision: Delegate to specialized agent');
      console.log('Agent Selected:', getAgentNameFromToolName(toolName));
      console.log('Function Called:', toolName);
      console.log('Arguments:', params);
      
      // In a real implementation, we would execute the specialized agent here
      console.log('\n✅ Test PASSED: The model correctly delegated to a specialized agent');
    } else {
      console.log('Decision: Handle directly');
      console.log('Response:', responseMessage.content);
      
      // For this specific test, we expect delegation to the Research Agent
      console.log('\n❌ Test FAILED: The model should have delegated to the Research Agent');
    }
  } catch (error) {
    console.error('Error testing agent:', error);
  }
}

// Helper function to get agent name from tool name
function getAgentNameFromToolName(toolName) {
  switch (toolName) {
    case 'research_task':
      return 'Research Agent';
    case 'coding_task':
      return 'Coding Agent';
    case 'data_analysis_task':
      return 'Data Analysis Agent';
    case 'writing_task':
      return 'Writing Agent';
    default:
      return 'Unknown Agent';
  }
}

// Run the test
testAgent(); 