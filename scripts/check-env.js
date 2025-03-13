#!/usr/bin/env node

/**
 * Environment Variable Check Utility
 * 
 * This script checks if required environment variables are properly set
 * and provides guidance on fixing any issues.
 * 
 * Usage:
 *   node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Required environment variables
const requiredVars = [
  {
    name: 'OPENAI_API_KEY',
    description: 'Your OpenAI API key from https://platform.openai.com/account/api-keys',
    required: true
  },
  // Add other required variables as needed
];

// Helper functions
function checkEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const envVars = {};
      lines.forEach(line => {
        if (!line.startsWith('#') && line.includes('=')) {
          const [key, value] = line.split('=');
          if (key && value !== undefined) {
            envVars[key.trim()] = value.trim();
          }
        }
      });
      
      return envVars;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  
  return null;
}

function colorize(text, color) {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };
  
  return `${colors[color] || ''}${text}${colors.reset}`;
}

// Main execution
console.log(colorize('\n=== Environment Variables Check ===\n', 'cyan'));

// Check .env files
const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
const envVars = {};

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const vars = checkEnvFile(filePath);
  
  if (vars) {
    console.log(colorize(`Found ${file}`, 'green'));
    Object.assign(envVars, vars);
  }
});

// Check for missing variables
const missingVars = [];
const emptyVars = [];

requiredVars.forEach(({ name, description, required }) => {
  if (!(name in envVars)) {
    if (required) {
      missingVars.push({ name, description });
    }
  } else if (!envVars[name] && required) {
    emptyVars.push({ name, description });
  }
});

// Display results
if (missingVars.length === 0 && emptyVars.length === 0) {
  console.log(colorize('\n✅ All required environment variables are set!\n', 'green'));
} else {
  if (missingVars.length > 0) {
    console.log(colorize('\n❌ Missing environment variables:', 'red'));
    missingVars.forEach(({ name, description }) => {
      console.log(`  - ${colorize(name, 'yellow')}: ${description}`);
    });
  }
  
  if (emptyVars.length > 0) {
    console.log(colorize('\n⚠️ Empty environment variables:', 'yellow'));
    emptyVars.forEach(({ name, description }) => {
      console.log(`  - ${colorize(name, 'yellow')}: ${description}`);
    });
  }
  
  // Provide guidance
  console.log(colorize('\nTo fix this issue:', 'cyan'));
  console.log('1. Create or update your .env.local file with the following variables:');
  
  [...missingVars, ...emptyVars].forEach(({ name }) => {
    console.log(`   ${name}=your_value_here`);
  });
  
  console.log('\n2. Restart your development server');
  console.log('3. For production, make sure to add these variables to your deployment environment\n');
}

// Check if the OpenAI API key is valid
if (envVars.OPENAI_API_KEY) {
  console.log(colorize('Checking OpenAI API key format...', 'cyan'));
  
  const apiKey = envVars.OPENAI_API_KEY;
  if (apiKey.startsWith('sk-') && apiKey.length > 20) {
    console.log(colorize('✅ OpenAI API key format looks valid', 'green'));
  } else {
    console.log(colorize('⚠️ OpenAI API key format might be invalid', 'yellow'));
    console.log('  The key should start with "sk-" and be longer than 20 characters');
  }
}

console.log(''); 