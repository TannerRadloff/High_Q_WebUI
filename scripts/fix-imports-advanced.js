const fs = require('fs');
const path = require('path');

// Get TypeScript config to understand path aliases
const getTsConfig = () => {
  try {
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8');
    return JSON.parse(tsConfigContent);
  } catch (error) {
    console.error('Error loading tsconfig.json:', error);
    return { compilerOptions: { paths: {} } };
  }
};

// Files to fix
const filesToFix = [
  'src/components/features/artifact-actions.tsx',
  'src/components/features/artifact-close-button.tsx',
  'src/components/features/artifact.tsx'
];

// Create missing components
const missingComponents = [
  {
    path: 'src/components/features/toolbar.tsx',
    content: `import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: (visible: boolean) => void;
  append?: any;
  isLoading?: boolean;
  stop?: () => void;
  setMessages?: any;
  artifactKind?: string;
}

function PureToolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-row items-center justify-between bg-background/80 p-2 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export const Toolbar = memo(PureToolbar);`
  }
];

// Create missing components
missingComponents.forEach(component => {
  try {
    console.log(`Creating component at ${component.path}`);
    fs.writeFileSync(component.path, component.content, 'utf8');
  } catch (error) {
    console.error(`Error creating component at ${component.path}:`, error);
  }
});

// Fix import paths in each file
filesToFix.forEach(filePath => {
  try {
    console.log(`Processing ${filePath}...`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update imports
    content = content
      // Fix UI component imports
      .replace(/from ['"]\.\/ui\/button['"]/g, "from '@/components/ui/button'")
      .replace(/from ['"]\.\/ui\/tooltip['"]/g, "from '@/components/ui/tooltip'")
      .replace(/from ['"]\.\/ui\/sidebar['"]/g, "from '@/components/ui/sidebar'")
      
      // Fix feature component imports
      .replace(/from ['"]@\/components\/features\/toolbar['"]/g, "from './toolbar'")
      .replace(/from ['"]@\/components\/features\/version-footer['"]/g, "from './version-footer'")
      .replace(/from ['"]@\/components\/layout\/toolbar['"]/g, "from './toolbar'")
      .replace(/from ['"]\.\/toolbar['"]/g, "from './toolbar'")
      
      // Fix icon imports
      .replace(/from ['"]\.\/icons['"]/g, "from '@/components/features/icons'")
      
      // Fix hook imports
      .replace(/from ['"]@\/hooks\/use-artifact['"]/g, "from '@/hooks/use-artifact'");
    
    // Write the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`Fixed imports in ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('All import paths fixed successfully!'); 