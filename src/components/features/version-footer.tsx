import { AnimatePresence, motion } from 'framer-motion';
import { type Document } from '@/lib/db/schema';
import { formatDistance } from 'date-fns';

interface VersionFooterProps {
  currentVersionIndex: number;
  documents: Document[] | undefined;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
}

export function VersionFooter({ 
  currentVersionIndex, 
  documents, 
  handleVersionChange 
}: VersionFooterProps) {
  if (!documents || documents.length === 0) return null;

  const currentDocument = documents[currentVersionIndex];
  if (!currentDocument) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="flex flex-row items-center justify-between border-t bg-background p-2 dark:border-zinc-700 border-zinc-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="flex flex-row gap-2 items-center">
          <div className="text-sm text-muted-foreground">
            Viewing version from{' '}
            {formatDistance(new Date(currentDocument.createdAt), new Date(), {
              addSuffix: true,
            })}
          </div>
        </div>

        <div className="flex flex-row gap-2">
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => handleVersionChange('prev')}
            disabled={currentVersionIndex === 0}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">|</span>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => handleVersionChange('next')}
            disabled={currentVersionIndex === documents.length - 1}
          >
            Next
          </button>
          <span className="text-sm text-muted-foreground">|</span>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => handleVersionChange('latest')}
          >
            Latest
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 