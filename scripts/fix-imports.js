/**
 * This script fixes import paths in the project to ensure consistent path resolution
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Helper function to safely write to files
function safelyWriteFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.warn(`Warning: Could not write to ${filePath}: ${error.message}`);
    return false;
  }
}

// Path mappings to fix
const pathMappings = {
  // Fix relative imports in src/components/features
  './ui/': '@/src/components/ui/',
  './markdown': '@/src/components/common/markdown',
  './icons': '@/src/components/common/icons',
  
  // Fix other common path issues
  '@/components/ui/': '@/src/components/ui/',
  '@/components/features/': '@/src/components/features/',
  '@/components/common/': '@/src/components/common/',
  '@/components/model-selector': '@/src/components/features/model-selector',
  '@/components/ui/sidebar': '@/src/components/ui/sidebar',
  '@/components/ui/error-boundary': '@/src/components/ui/error-boundary',
  '@/src/components/auth/auth-provider': '@/components/auth/auth-provider',
  
  // Fix specific component imports
  './visibility-selector': '@/src/components/features/visibility-selector',
  './user-auth-status': '@/src/components/auth/user-auth-status',
  './artifact': '@/src/components/features/artifact',
  './model-selector': '@/src/components/features/model-selector',
  './create-artifact': '@/src/components/features/create-artifact',
  './toolbar': '@/src/components/features/toolbar',
  './ui/sidebar': '@/src/components/ui/sidebar',
};

// Special fixes for specific files
const specialFixes = [
  {
    file: 'src/components/layout/toolbar.tsx',
    replacements: [
      {
        from: "import { artifactDefinitions, type ArtifactKind } from '@/src/components/features/artifact';",
        to: "import { artifactDefinitions } from '@/src/components/features/artifact';\nimport type { ArtifactKind } from '@/src/types/artifact';"
      },
      {
        from: "import type { ArtifactToolbarItem } from './create-artifact';",
        to: "import type { ArtifactToolbarItem } from '@/src/components/features/create-artifact';"
      }
    ]
  },
  {
    file: 'components/chat-header.tsx',
    replacements: [
      {
        from: "import { useSidebar } from './ui/sidebar';",
        to: "import { useSidebar } from '@/src/components/ui/sidebar';"
      }
    ]
  },
  {
    file: 'components/artifact.tsx',
    replacements: [
      {
        from: "import { useSidebar } from './ui/sidebar';",
        to: "import { useSidebar } from '@/src/components/ui/sidebar';"
      }
    ]
  }
];

// Create a map of files that need to be completely rewritten
const fileRewrites = {
  'src/components/layout/toolbar.tsx': `'use client';

import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import cx from 'classnames';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import {
  type Dispatch,
  memo,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import { nanoid } from 'nanoid';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { sanitizeUIMessages } from '@/utils/messages';

import {
  ArrowUpIcon,
  StopIcon,
  SummarizeIcon,
} from '@/src/components/common/icons';
import { artifactDefinitions } from '@/src/components/features/artifact';
import type { ArtifactKind } from '@/src/types/artifact';
import type { ArtifactToolbarItem } from '@/src/components/features/create-artifact';
import type { UseChatHelpers } from 'ai/react';

type ToolProps = {
  description: string;
  icon: ReactNode;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  onClick: ({
    appendMessage,
  }: {
    appendMessage: UseChatHelpers['append'];
  }) => void;
}`
};

// Find all TypeScript and TSX files in the src directory
let files = [];
try {
  files = glob.sync('{src,components,app}/**/*.{ts,tsx}');
  console.log(`Found ${files.length} files to process`);
} catch (error) {
  console.error(`Error finding files: ${error.message}`);
  process.exit(1);
}

// Process each file
let successCount = 0;
let errorCount = 0;

files.forEach(file => {
  try {
    // Check if this file needs a complete rewrite
    if (fileRewrites[file]) {
      console.log(`Completely rewriting ${file}`);
      let content;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch (error) {
        console.warn(`Warning: Could not read ${file}: ${error.message}`);
        errorCount++;
        return;
      }
      
      // Only rewrite the imports section at the top of the file
      const importEndIndex = content.indexOf('type ToolProps');
      if (importEndIndex > 0) {
        // Keep the original content after the ToolProps type declaration
        const toolPropsType = content.substring(importEndIndex);
        // Find where the ToolProps type ends
        const toolPropsEndIndex = toolPropsType.indexOf('};') + 2;
        // Get the rest of the file after the ToolProps type
        const restOfFile = toolPropsType.substring(toolPropsEndIndex);
        
        // Combine the fixed import section with the rest of the file
        const newContent = fileRewrites[file] + restOfFile;
        
        if (safelyWriteFile(file, newContent)) {
          successCount++;
          console.log(`Fixed imports in ${file}`);
        } else {
          errorCount++;
        }
      }
      return;
    }

    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (error) {
      console.warn(`Warning: Could not read ${file}: ${error.message}`);
      errorCount++;
      return;
    }
    
    let hasChanges = false;
    
    // Apply special fixes for specific files
    const specialFix = specialFixes.find(fix => fix.file === file);
    if (specialFix) {
      specialFix.replacements.forEach(replacement => {
        if (content.includes(replacement.from)) {
          content = content.replace(replacement.from, replacement.to);
          hasChanges = true;
        }
      });
    }
    
    // Apply each path mapping
    Object.entries(pathMappings).forEach(([from, to]) => {
      // Look for import statements with the path to replace
      const importRegex = new RegExp(`import\\s+(?:{[^}]*}|[^{};]*)\\s+from\\s+['"]${from}`, 'g');
      
      if (importRegex.test(content)) {
        hasChanges = true;
        content = content.replace(importRegex, match => {
          return match.replace(from, to);
        });
      }
    });
    
    // Save the file if changes were made
    if (hasChanges) {
      if (safelyWriteFile(file, content)) {
        successCount++;
        console.log(`Fixed imports in ${file}`);
      } else {
        errorCount++;
      }
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
    errorCount++;
  }
});

console.log(`Import path fixing completed! Success: ${successCount}, Errors: ${errorCount}`); 