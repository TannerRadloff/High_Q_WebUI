import { MimirAgent, runAgent } from './index';

// Initialize the Mimir agent
const mimirAgent = new MimirAgent();

// Test prompts to verify agent delegation logic
const testPrompts = [
  {
    name: 'Simple greeting',
    prompt: 'Hello, how are you today?',
    expectedAgent: 'Mimir (Triage Agent)', // Should be handled directly by Mimir
  },
  {
    name: 'Car buying advice',
    prompt: 'I want to buy a car, what should I do?',
    expectedAgent: 'Research', // Should delegate to Research Agent
  },
  {
    name: 'Coding question',
    prompt: 'How do I implement a binary search tree in JavaScript?',
    expectedAgent: 'Coding', // Should delegate to Coding Agent
  },
  {
    name: 'Data analysis request',
    prompt: 'I have sales data for the last 5 years. Can you help me analyze trends and create visualizations?',
    expectedAgent: 'Data Analysis', // Should delegate to Data Analysis Agent
  },
  {
    name: 'Writing assistance',
    prompt: 'Can you help me write a compelling cover letter for a job application?',
    expectedAgent: 'Writing', // Should delegate to Writing Agent
  },
  {
    name: 'Multi-domain question',
    prompt: 'I need to analyze customer feedback data and write a report summarizing the findings.',
    expectedAgent: 'Data Analysis', // Primary need is data analysis
  }
];

/**
 * Run tests to verify agent delegation logic
 */
async function runTests() {
  console.log('🧪 Testing Mimir Agent Orchestration Logic\n');
  
  for (const test of testPrompts) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`Prompt: "${test.prompt}"`);
    console.log(`Expected Agent: ${test.expectedAgent}`);
    
    try {
      // Run the agent with the test prompt
      const result = await runAgent(mimirAgent, test.prompt);
      
      // Log the result
      console.log(`Actual Agent: ${result.agent}`);
      console.log(`Model Used: ${result.model || 'unknown'}`);
      
      if (result.delegationReasoning) {
        console.log(`Delegation Reasoning: ${result.delegationReasoning}`);
      }
      
      // Determine if the test passed
      const passed = result.agent.includes(test.expectedAgent);
      console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      // Log a snippet of the response content
      const contentPreview = result.content.length > 100 
        ? result.content.substring(0, 100) + '...' 
        : result.content;
      console.log(`Response Preview: "${contentPreview}"`);
    } catch (error) {
      console.error(`Error running test: ${error}`);
      console.log('Result: ❌ FAILED (Error)');
    }
  }
  
  console.log('\n🏁 All tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});

// Export the test function for use in other scripts
export { runTests }; 