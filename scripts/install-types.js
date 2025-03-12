/**
 * Script to install TypeScript type declarations for the project
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for required TypeScript type declarations...');

// List of type packages to install
const typePackages = [
  '@types/react',
  '@types/react-dom',
  '@types/node',
];

// Check package.json to see if we need to add any packages
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const devDependencies = packageJson.devDependencies || {};

// Filter to only include packages that are not already in package.json
const packagesToInstall = typePackages.filter(pkg => !devDependencies[pkg]);

if (packagesToInstall.length === 0) {
  console.log('✅ All required TypeScript type declarations are already installed.');
} else {
  console.log(`📦 Installing ${packagesToInstall.length} TypeScript type packages...`);
  
  try {
    // Check if using npm, yarn, or pnpm
    const hasYarn = fs.existsSync(path.join(__dirname, '..', 'yarn.lock'));
    const hasPnpm = fs.existsSync(path.join(__dirname, '..', 'pnpm-lock.yaml'));
    
    let installCommand;
    if (hasPnpm) {
      installCommand = `pnpm add -D ${packagesToInstall.join(' ')}`;
    } else if (hasYarn) {
      installCommand = `yarn add -D ${packagesToInstall.join(' ')}`;
    } else {
      installCommand = `npm install --save-dev ${packagesToInstall.join(' ')}`;
    }
    
    console.log(`🔧 Running: ${installCommand}`);
    execSync(installCommand, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    console.log('✅ TypeScript type declarations installed successfully.');
  } catch (error) {
    console.error('❌ Error installing TypeScript type declarations:', error.message);
    console.log('\nPlease manually install the following packages:');
    packagesToInstall.forEach(pkg => console.log(`- ${pkg}`));
    process.exit(1);
  }
}

// Verify TypeScript custom type declarations exist
const typesDir = path.join(__dirname, '..', 'types');
if (!fs.existsSync(typesDir)) {
  console.log('📁 Creating types directory for custom type declarations...');
  fs.mkdirSync(typesDir, { recursive: true });
}

// Check for required custom type declaration files
const requiredTypeFiles = [
  'lucide-react.d.ts',
  'ui-components.d.ts',
  'next-types.d.ts',
  'vercel-modules.d.ts',
];

const missingTypeFiles = requiredTypeFiles.filter(
  file => !fs.existsSync(path.join(typesDir, file))
);

if (missingTypeFiles.length > 0) {
  console.log('⚠️ Missing custom type declaration files:');
  missingTypeFiles.forEach(file => console.log(`- ${file}`));
  console.log('\nPlease run the TypeScript setup script to create these files.');
} else {
  console.log('✅ All required custom type declaration files exist.');
}

console.log('\n🎉 TypeScript setup complete!'); 