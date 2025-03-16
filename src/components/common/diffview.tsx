'use client';

interface DiffViewProps {
  original: string;
  modified: string;
}

export function DiffView({ original, modified }: DiffViewProps) {
  return (
    <div className="border rounded-md p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Original</h3>
          <pre className="p-2 bg-muted rounded-md whitespace-pre-wrap">{original}</pre>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Modified</h3>
          <pre className="p-2 bg-muted rounded-md whitespace-pre-wrap">{modified}</pre>
        </div>
      </div>
    </div>
  );
} 