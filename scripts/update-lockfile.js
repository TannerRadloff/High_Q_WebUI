/**
 * Script to update the pnpm-lock.yaml file when package.json changes
 * This can be especially useful for CI environments or when preparing deployments
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking for pnpm-lock.yaml status...');

// Path to package.json and pnpm-lock.yaml
const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml');

// Check if the lockfile exists
if (!fs.existsSync(lockfilePath)) {
  console.log('⚠️ Lock file not found. Generating a new one...');
  try {
    execSync('pnpm install', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Lock file generated successfully.');
  } catch (error) {
    console.error('❌ Failed to generate lock file:', error.message);
    process.exit(1);
  }
} else {
  try {
    // Check for any differences or outdated packages
    console.log('🧪 Checking for outdated dependencies...');
    execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Lock file is up to date with package.json.');
  } catch (error) {
    console.error('❌ Error updating lock file:', error.message);
    process.exit(1);
  }
}

console.log('🎉 Lock file check/update complete!'); 