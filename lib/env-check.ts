/**
 * Environment variable validation module
 * 
 * This module checks for critical environment variables and logs detailed messages
 * about missing or invalid configurations.
 */

interface EnvCheckResult {
  isValid: boolean;
  missingVars: string[];
  message: string;
}

/**
 * Check if critical environment variables are properly set
 */
export function checkRequiredEnvVars(): EnvCheckResult {
  const requiredVars = [
    {
      name: 'OPENAI_API_KEY',
      value: process.env.OPENAI_API_KEY,
      description: 'Your OpenAI API key from https://platform.openai.com/account/api-keys'
    },
    // Add other required variables here
  ];

  const missingVars = requiredVars.filter(v => !v.value);
  
  if (missingVars.length === 0) {
    return {
      isValid: true,
      missingVars: [],
      message: 'All required environment variables are set correctly.'
    };
  }

  // Create detailed error message
  const errorMessages = missingVars.map(v => {
    return `- ${v.name}: ${v.description}`;
  });

  const message = `
Missing required environment variables:
${errorMessages.join('\n')}

Please add these variables to your .env.local file. 
For guidance, see the .env.example file or the project documentation.
`;

  console.error(message);
  
  return {
    isValid: false,
    missingVars: missingVars.map(v => v.name),
    message
  };
}

/**
 * Display a user-friendly error page when critical environment variables are missing
 */
export function getEnvErrorMessage(): string | null {
  const result = checkRequiredEnvVars();
  
  if (!result.isValid) {
    return `The application is misconfigured. Missing required environment variables: ${result.missingVars.join(', ')}. Please check the server logs for more details.`;
  }
  
  return null;
} 