const fs = require('fs');
const path = require('path');

// Read the current tsconfig.json
const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8');
const tsConfig = JSON.parse(tsConfigContent);

// Make sure the paths are properly configured
if (!tsConfig.compilerOptions.paths) {
  tsConfig.compilerOptions.paths = {};
}

// Update path mappings
tsConfig.compilerOptions.paths = {
  ...tsConfig.compilerOptions.paths,
  '@/*': ['./*'],
  '@/components/*': ['./src/components/*'],
  '@/hooks/*': ['./src/hooks/*'],
  '@/types/*': ['./src/types/*'],
  '@/lib/*': ['./src/lib/*'],
  '@/artifacts/*': ['./src/artifacts/*']
};

// Write the updated tsconfig
fs.writeFileSync(
  tsConfigPath,
  JSON.stringify(tsConfig, null, 2),
  'utf8'
);

console.log('Updated tsconfig.json path mappings!'); 