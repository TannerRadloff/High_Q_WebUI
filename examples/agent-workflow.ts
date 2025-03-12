import { AgentFactory, AgentType } from '../agents/AgentFactory';
import { webSearchTool, retrievalTool } from '../agents/tools';

/**
 * This example demonstrates the agent factory pattern and using agents as tools
 */
async function main() {
  // Create a factory instance
  const factory = new AgentFactory();
  
  // Set default settings for all agents
  factory.setDefaults({
    model: 'gpt-4o',
    temperature: 0.3
  });
  
  // Create a specialized research agent with web search capabilities
  const researchAgent = factory.createAgent(AgentType.CUSTOM, {
    name: 'ResearchAssistant',
    instructions: 'You are a research assistant that helps find information and answers questions.',
    tools: [webSearchTool, retrievalTool]
  });
  
  // Create a report generation agent
  const reportAgent = factory.createAgent(AgentType.CUSTOM, {
    name: 'ReportGenerator',
    instructions: 'You specialize in creating well-formatted reports from research data.',
  });
  
  // Create a runner agent that uses the other agents as tools
  const runner = factory.createAgent(AgentType.CUSTOM, {
    name: 'Runner',
    instructions: 'You determine the best approach to answer the user\'s question and delegate to specialized agents.',
    tools: [
      researchAgent.asTool(
        'research', 
        'Search for information to answer factual questions'
      ),
      reportAgent.asTool(
        'generate_report', 
        'Format information into a well-structured report'
      )
    ]
  });
  
  // Handle a user query using the runner
  try {
    // Define our callbacks to handle streaming
    const callbacks = {
      onStart: () => console.log('Processing has started...'),
      onToken: (token: string) => process.stdout.write(token),
      onComplete: () => console.log('\n--- Processing complete ---'),
      onError: (error: Error) => console.error('Error:', error.message)
    };
    
    // Example user query
    const userQuery = "What are the latest advancements in AI agents and how can they be applied to business workflows?";
    
    console.log(`\n\nUSER QUERY: ${userQuery}\n`);
    
    // Process the query with streaming
    if (runner.streamTask) {
      await runner.streamTask(userQuery, callbacks, {
        // Additional context data
        source: 'example',
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback to non-streaming API
      const result = await runner.handleTask(userQuery, {
        // Additional context data
        source: 'example',
        timestamp: new Date().toISOString()
      });
      
      console.log('\n\nFinal result:', typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Error running agent workflow:', error);
  } finally {
    // Clean up resources
    factory.clearCache();
  }
}

// Run the example
main().catch(console.error); 