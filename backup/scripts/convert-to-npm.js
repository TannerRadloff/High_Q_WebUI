const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const pnpmLockPath = path.join(rootDir, 'pnpm-lock.yaml');

// Step 1: Check if pnpm-lock.yaml exists and delete it
if (fs.existsSync(pnpmLockPath)) {
  console.log('Removing pnpm-lock.yaml...');
  fs.unlinkSync(pnpmLockPath);
  console.log('Successfully removed pnpm-lock.yaml');
} else {
  console.log('pnpm-lock.yaml not found, skipping deletion.');
}

// Step 2: Install dependencies with npm to generate package-lock.json
try {
  console.log('Installing dependencies with npm...');
  console.log('This might take a while...');
  
  // Clean install to generate a fresh package-lock.json
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  
  console.log('Successfully installed dependencies and generated package-lock.json');
  
  // Check if package-lock.json was created
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    console.log('package-lock.json was successfully created.');
  } else {
    console.error('Warning: package-lock.json was not created.');
  }
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}

console.log('Successfully converted from pnpm to npm!');
console.log('You can now use npm commands like "npm run build" and "npm run dev".'); 