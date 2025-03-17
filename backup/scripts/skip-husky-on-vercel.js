/**
 * This script checks if we're in a Vercel environment and skips Husky installation if we are.
 * It's used in the prepare script in package.json.
 */

// Check if we're in a CI environment (like Vercel)
const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';

if (isCI) {
  console.log('CI environment detected, skipping Husky installation');
  process.exit(0);
}

// If we're not in a CI environment, try to install Husky
try {
  require('husky').install();
  console.log('Husky installed successfully');
} catch (error) {
  console.log('Failed to install Husky, skipping:', error.message);
} 