/**
 * Environment variable validation module
 * 
 * This module checks for critical environment variables and logs detailed messages
 * about missing or invalid configurations.
 */

// Create a variable to cache validation results to avoid multiple checks
let cachedResult: EnvCheckResult | null = null;

interface EnvCheckResult {
  isValid: boolean;
  missingVars: string[];
  message: string;
}

/**
 * Special handling for environment variables in client components
 * In Next.js, client components can't directly access server environment variables
 */
function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if critical environment variables are properly set
 * This can only fully verify on the server side
 */
export function checkRequiredEnvVars(): EnvCheckResult {
  // Return cached result if available
  if (cachedResult) {
    return cachedResult;
  }
  
  // If in client environment, we can only report issues detected server-side
  if (!isServerEnvironment()) {
    // For client components, we don't have direct access to server-side env vars
    // Return a default result that doesn't try to access process.env
    cachedResult = {
      isValid: true, // Will be overwritten by server-side check if there's an issue
      missingVars: [],
      message: 'Environment validation must occur on the server side'
    };
    return cachedResult;
  }

  // Server-side check
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
    cachedResult = {
      isValid: true,
      missingVars: [],
      message: 'All required environment variables are set correctly.'
    };
    return cachedResult;
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
  
  cachedResult = {
    isValid: false,
    missingVars: missingVars.map(v => v.name),
    message
  };
  
  return cachedResult;
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