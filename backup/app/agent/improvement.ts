import { Agent, AgentContext, AgentResponse } from './agent';
import { JudgeAgent, Evaluation } from './JudgeAgent';
import { z } from 'zod';
import { TraceMetadata } from './tracing';

/**
 * Configuration options for the improvement loop
 */
export interface ImprovementLoopConfig {
  maxIterations?: number;  // Maximum number of improvement attempts
  minAcceptableScore?: number;  // Minimum score to consider acceptable
  timeout?: number;  // Maximum time in ms for the whole process
  trace?: TraceMetadata;  // Optional tracing metadata
  verbose?: boolean;  // Whether to include detailed improvement history
}

/**
 * Result of the improvement loop, including the final response,
 * all evaluations, and metadata about the process
 */
export interface ImprovementResult<T = string> {
  finalResponse: T;  // The final improved response
  finalEvaluation: Evaluation;  // The final evaluation
  iterations: number;  // Number of improvement iterations performed
  evaluations: Evaluation[];  // All evaluations from each iteration
  improvementHistory?: {  // Optional detailed history (if verbose=true)
    originalResponse: T;
    responses: T[];
    feedback: string[];
  };
  success: boolean;  // Whether improvement was successful
}

/**
 * A utility function that implements a self-improvement loop using a judge agent.
 * This function takes an agent's response, evaluates it with a judge, and if needed,
 * sends the evaluation back to the original agent for improvement, continuing
 * until the response meets quality standards or maximum iterations are reached.
 *
 * @param agent The agent that will generate and improve responses
 * @param judge The judge agent that will evaluate responses
 * @param query The original user query
 * @param initialResponse Optional initial response (if not provided, will be generated)
 * @param context Optional context data for the agent
 * @param config Configuration options for the improvement loop
 * @returns The improved response and metadata about the process
 */
export async function improveWithFeedback<T = string>(
  agent: Agent<T>,
  judge: JudgeAgent,
  query: string,
  initialResponse?: T,
  context?: AgentContext,
  config: ImprovementLoopConfig = {}
): Promise<ImprovementResult<T>> {
  // Set default configuration values
  const {
    maxIterations = 3,
    minAcceptableScore = 8,
    timeout = 60000,
    trace,
    verbose = false
  } = config;

  // Setup for tracking improvement process
  const startTime = Date.now();
  const evaluations: Evaluation[] = [];
  const responses: T[] = [];
  const feedbackHistory: string[] = [];
  let iterations = 0;
  let finalResponse: T;
  let currentResponse: T;

  // Get initial response if not provided
  if (initialResponse) {
    currentResponse = initialResponse;
  } else {
    // Need to cast the response to T
    currentResponse = await agent.handleTask(query, context) as unknown as T;
  }
  
  // Save the original response for history
  const originalResponse = currentResponse;
  responses.push(currentResponse);

  // Main improvement loop
  let continueImproving = true;
  while (continueImproving && iterations < maxIterations) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      console.warn('Improvement loop timed out.');
      break;
    }

    // Evaluate the current response
    const evaluation = await judge.evaluateResponse(
      query, 
      typeof currentResponse === 'string' ? currentResponse : JSON.stringify(currentResponse)
    );
    evaluations.push(evaluation);
    
    // Check if response meets quality standards
    if (evaluation.is_acceptable && evaluation.score >= minAcceptableScore) {
      continueImproving = false;
      finalResponse = currentResponse;
      break;
    }

    // Prepare feedback for the agent
    iterations++;
    if (iterations >= maxIterations) {
      // Last iteration, so use the best response so far
      const bestEvalIndex = evaluations.findIndex(
        (evalItem) => evalItem.score === Math.max(...evaluations.map(e => e.score))
      );
      finalResponse = responses[bestEvalIndex];
      break;
    }

    // Format feedback for the agent
    const feedback = `
I need you to improve your previous response based on this feedback:

SCORE: ${evaluation.score}/10

STRENGTHS:
${evaluation.strengths.map(s => `- ${s}`).join('\n')}

WEAKNESSES:
${evaluation.weaknesses.map(w => `- ${w}`).join('\n')}

SUGGESTIONS:
${evaluation.suggestions.map(s => `- ${s}`).join('\n')}

REASONING:
${evaluation.reasoning}

Please provide an improved response addressing these points.`;

    feedbackHistory.push(feedback);

    // Get improved response from the agent
    const improvedResponse = await agent.handleTask(
      `${query}\n\n${feedback}`,
      context
    ) as unknown as T;
    
    currentResponse = improvedResponse;
    responses.push(improvedResponse);
  }

  // If we didn't set finalResponse in the loop, use the last response
  if (!finalResponse!) {
    finalResponse = currentResponse;
  }

  // Ensure we have a final evaluation
  const finalEvaluation = evaluations[evaluations.length - 1];

  // Build result object
  const result: ImprovementResult<T> = {
    finalResponse,
    finalEvaluation,
    iterations,
    evaluations,
    success: finalEvaluation.is_acceptable && finalEvaluation.score >= minAcceptableScore
  };

  // Add detailed history if verbose mode is enabled
  if (verbose) {
    result.improvementHistory = {
      originalResponse,
      responses,
      feedback: feedbackHistory
    };
  }

  return result;
}

/**
 * A simpler version of the improvement loop that returns just the final improved response
 * without all the metadata. Useful for simpler use cases.
 */
export async function improveResponse<T = string>(
  agent: Agent<T>,
  query: string,
  context?: AgentContext,
  config: Omit<ImprovementLoopConfig, 'verbose'> = {}
): Promise<T> {
  // Create a judge agent with default settings
  const judge = new JudgeAgent();
  
  // Run the improvement loop
  const result = await improveWithFeedback<T>(agent, judge, query, undefined, context, {
    ...config,
    verbose: false
  });
  
  // Return just the final response
  return result.finalResponse;
} 