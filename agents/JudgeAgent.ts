import { BaseAgent } from './BaseAgent';
import { z } from 'zod';
import { AgentResponse } from './agent';

/**
 * Response evaluation schema for structured judge feedback
 */
export const EvaluationSchema = z.object({
  score: z.number().min(1).max(10).describe('Overall score from 1-10'),
  strengths: z.array(z.string()).describe('Specific strengths of the response'),
  weaknesses: z.array(z.string()).describe('Areas that need improvement'),
  suggestions: z.array(z.string()).describe('Specific suggestions for improvement'),
  is_acceptable: z.boolean().describe('Whether the response meets minimum quality standards'),
  reasoning: z.string().describe('Brief reasoning for the evaluation')
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

/**
 * JudgeAgent specializes in evaluating other agents' responses 
 * and providing structured feedback for improvement
 */
export class JudgeAgent extends BaseAgent<Evaluation> {
  constructor(config: {
    name?: string;
    model?: string;
    temperature?: number;
    evaluationCriteria?: string[];
  } = {}) {
    // Define default evaluation criteria if not provided
    const defaultCriteria = [
      'Accuracy and factual correctness',
      'Completeness of response',
      'Relevance to the original query',
      'Clarity and organization',
      'Appropriate level of detail',
      'Logical flow and coherence'
    ];

    const criteria = config.evaluationCriteria || defaultCriteria;
    const criteriaText = criteria.map(c => `- ${c}`).join('\n');

    super({
      name: config.name || 'JudgeAgent',
      instructions: `You are an expert evaluator who assesses the quality of responses.
      
Your job is to provide fair, objective feedback on responses based on these criteria:
${criteriaText}

For each response you evaluate:
1. Identify specific strengths of the response
2. Identify specific weaknesses or areas for improvement
3. Provide actionable suggestions for improving the response
4. Determine if the response meets minimum quality standards
5. Assign an overall score from 1-10
6. Provide brief reasoning for your evaluation

Be specific and constructive in your feedback. Your goal is to help improve responses, not just criticize them.`,
      model: config.model || 'gpt-4o',
      modelSettings: {
        temperature: config.temperature ?? 0.3
      },
      outputType: EvaluationSchema
    });
  }

  /**
   * Evaluate a given response based on the original query
   */
  async evaluateResponse(query: string, response: string): Promise<Evaluation> {
    const evaluationPrompt = `I need you to evaluate the following response to this query.

QUERY: "${query}"

RESPONSE TO EVALUATE:
"""
${response}
"""

Provide a detailed evaluation following the criteria in your instructions.`;

    const result = await this.handleTask(evaluationPrompt);
    return result as unknown as Evaluation;
  }
} 