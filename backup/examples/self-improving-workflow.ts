import { AgentFactory, AgentType } from '../agents/AgentFactory';
import { webSearchTool } from '../agents/tools';

/**
 * This example demonstrates how to use the Factory to create a self-improving agent workflow
 * This pattern follows OpenAI's Agents SDK guidance on agent evaluation and improvement
 */
async function main() {
  // Create a factory instance
  const factory = new AgentFactory();
  
  // Set default settings for all agents
  factory.setDefaults({
    model: 'gpt-4o',
    temperature: 0.3
  });
  
  // Create a self-improving workflow with a research agent as the primary agent
  const selfImprovingWorkflow = factory.createSelfImprovingWorkflow({
    primaryAgentType: AgentType.RESEARCH,
    primaryAgentConfig: {
      name: 'TechnicalExpert',
      instructions: `You are a technical expert specialized in software development and architecture.
      Provide in-depth, technically accurate responses to questions about programming,
      system design, and technology trends.`,
      tools: [webSearchTool]
    },
    judgeAgentConfig: {
      evaluationCriteria: [
        'Technical accuracy',
        'Depth of explanation',
        'Code quality (if applicable)',
        'Practical applicability',
        'Consideration of tradeoffs',
        'Up-to-date information'
      ]
    },
    improvementConfig: {
      maxIterations: 2,
      minAcceptableScore: 8
    }
  });
  
  // Define example queries
  const queries = [
    "What are the best practices for implementing authentication in a microservices architecture?",
    "Explain the differences between REST, GraphQL, and gRPC for API design"
  ];
  
  // Process each query with the self-improving workflow
  for (const query of queries) {
    console.log(`\n===== QUERY: ${query} =====\n`);
    
    try {
      console.time('Processing time');
      
      // Process the query with the self-improving workflow
      const result = await selfImprovingWorkflow.handleTask(query);
      
      console.timeEnd('Processing time');
      
      // Output results
      console.log(`\nFinal response after ${result.iterations} improvement iterations:`);
      console.log('-------------------');
      console.log(result.finalResponse);
      console.log('-------------------');
      
      console.log(`\nQuality score: ${result.finalEvaluation.score}/10`);
      console.log(`Quality assessment: ${result.success ? 'Meets quality standards' : 'Below quality threshold'}`);
      
      // Show improvement progression
      if (result.evaluations.length > 1) {
        console.log('\nImprovement progression:');
        result.evaluations.forEach((evaluation, i) => {
          console.log(`Iteration ${i + 1}: Score ${evaluation.score}/10 (${evaluation.is_acceptable ? 'Acceptable' : 'Needs improvement'})`);
        });
      }
    } catch (error) {
      console.error(`Error processing query: ${error}`);
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(err => {
    console.error('Error running example:', err);
    process.exit(1);
  });
} 