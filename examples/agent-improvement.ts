import { BaseAgent } from '../agents/BaseAgent';
import { JudgeAgent } from '../agents/JudgeAgent';
import { improveWithFeedback, improveResponse } from '../agents/improvement';
import { webSearchTool } from '../agents/tools';

/**
 * This example demonstrates how to use the agent self-improvement pattern
 * with a JudgeAgent to provide feedback and improve responses through multiple iterations.
 */
async function main() {
  // Create our primary agent - this can be any agent
  const researchAgent = new BaseAgent({
    name: 'ResearchAgent',
    instructions: `You are a helpful research assistant. 
    Your job is to research topics thoroughly and provide comprehensive, accurate responses.
    Include relevant facts, examples, and context to fully address the query.`,
    model: 'gpt-4o',
    tools: [webSearchTool]
  });
  
  // Create a judge agent with custom evaluation criteria
  const judge = new JudgeAgent({
    name: 'QualityJudge',
    model: 'gpt-4o',
    evaluationCriteria: [
      'Factual accuracy and correctness',
      'Comprehensiveness (covers all key aspects)',
      'Clarity and understandability',
      'Structure and organization',
      'Relevance to the query',
      'Depth of analysis',
      'Appropriate tone and style'
    ]
  });
  
  // Example user query that requires a high-quality response
  const userQuery = "What are the pros and cons of using microservices architecture, and when is it appropriate to use it versus a monolithic approach?";
  
  console.log(`\nQuery: ${userQuery}`);
  console.log('\n=== BASIC APPROACH (without improvement) ===');
  
  // First, get a response without the improvement loop
  console.time('Basic response time');
  const basicResponse = await researchAgent.handleTask(userQuery);
  console.timeEnd('Basic response time');
  
  console.log(`\nResponse:\n${basicResponse}`);
  
  // Have the judge evaluate the basic response
  const basicEvaluation = await judge.evaluateResponse(
    userQuery, 
    typeof basicResponse === 'string' ? basicResponse : JSON.stringify(basicResponse)
  );
  
  console.log('\nBasic response evaluation:');
  console.log(`Score: ${basicEvaluation.score}/10`);
  console.log(`Acceptable: ${basicEvaluation.is_acceptable ? 'Yes' : 'No'}`);
  console.log('Strengths:');
  basicEvaluation.strengths.forEach(s => console.log(`- ${s}`));
  console.log('Weaknesses:');
  basicEvaluation.weaknesses.forEach(w => console.log(`- ${w}`));
  
  console.log('\n\n=== IMPROVEMENT LOOP APPROACH ===');
  
  // Now use the improvement loop
  console.time('Improvement loop time');
  const result = await improveWithFeedback(
    researchAgent,
    judge,
    userQuery,
    undefined,  // No initial response, will be generated
    undefined,  // No context
    {
      maxIterations: 3,
      minAcceptableScore: 8,
      verbose: true
    }
  );
  console.timeEnd('Improvement loop time');
  
  // Output results of the improvement process
  console.log(`\nFinal response after ${result.iterations} iterations:`);
  console.log(result.finalResponse);
  
  console.log('\nFinal evaluation:');
  console.log(`Score: ${result.finalEvaluation.score}/10`);
  console.log(`Acceptable: ${result.finalEvaluation.is_acceptable ? 'Yes' : 'No'}`);
  console.log('Strengths:');
  result.finalEvaluation.strengths.forEach(s => console.log(`- ${s}`));
  
  // Show improvement history
  if (result.improvementHistory) {
    console.log('\nImprovement journey:');
    for (let i = 0; i < result.evaluations.length; i++) {
      console.log(`\nIteration ${i + 1}:`);
      console.log(`Score: ${result.evaluations[i].score}/10`);
      if (i < result.improvementHistory.feedback.length) {
        console.log(`Feedback summary: ${result.improvementHistory.feedback[i].substring(0, 100)}...`);
      }
    }
  }
  
  console.log(`\nImprovement successful: ${result.success ? 'Yes' : 'No'}`);
  
  // Compare scores
  const improvementAmount = result.finalEvaluation.score - basicEvaluation.score;
  console.log(`\nImprovement in score: ${improvementAmount > 0 ? '+' : ''}${improvementAmount.toFixed(1)} points`);
  
  // Demonstrate the simpler improveResponse function
  console.log('\n\n=== SIMPLIFIED IMPROVEMENT APPROACH ===');
  console.log('Using improveResponse (simpler API with less verbose output):');
  
  console.time('Simple improvement time');
  const simplifiedImprovedResponse = await improveResponse(
    researchAgent,
    "What are the main challenges of implementing a zero-trust security model?",
    undefined,
    { maxIterations: 2 }
  );
  console.timeEnd('Simple improvement time');
  
  console.log(`\nImproved response:\n${simplifiedImprovedResponse}`);
}

// Run the example
if (require.main === module) {
  main().catch(err => {
    console.error('Error running example:', err);
    process.exit(1);
  });
} 