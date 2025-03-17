'use client';

import React, { useState } from 'react';

// Define local Artifact interface
interface Artifact {
  id: string;
  type: 'code' | 'text' | 'image' | 'sheet';
  content: string;
  title?: string;
  metadata?: Record<string, any>;
  versions?: string[];
  currentVersion?: string;
}

// Placeholder components until we create them
const CodeEditor = ({ value, onChange, readOnly }: { value: string, onChange: (value: string) => void, readOnly?: boolean }) => (
  <div className="p-4">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-[300px] p-2 border rounded-md resize-none font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={readOnly}
    />
  </div>
);

const SpreadsheetEditor = ({ value, onChange, readOnly }: { value: string, onChange: (value: string) => void, readOnly?: boolean }) => (
  <div className="p-4">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-[300px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={readOnly}
    />
  </div>
);

// Placeholder VersionFooter component
interface VersionFooterProps {
  version?: string;
  versions?: string[];
  isLoading?: boolean;
  onVersionChange?: (version: string) => void;
}

const VersionFooter = ({ version, versions, isLoading, onVersionChange }: VersionFooterProps) => {
  if (!versions || versions.length <= 1) return null;
  
  return (
    <div className="border-t p-2 flex justify-between items-center bg-gray-50">
      <span className="text-sm text-gray-500">Version:</span>
      <select
        value={version}
        onChange={(e) => onVersionChange?.(e.target.value)}
        disabled={isLoading}
        className="text-sm border rounded px-2 py-1 bg-white"
      >
        {versions.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
};

interface ArtifactProps {
  artifact: Artifact;
  onContentChange?: (content: string) => void;
  onVersionChange?: (version: string) => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function Artifact({
  artifact,
  onContentChange,
  onVersionChange,
  isLoading = false,
  readOnly = false
}: ArtifactProps) {
  const [content, setContent] = useState(artifact.content);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
  };

  const renderContent = () => {
    switch (artifact.type) {
      case 'code':
        return (
          <CodeEditor
            value={content}
            onChange={handleContentChange}
            readOnly={readOnly || isLoading}
          />
        );
      case 'sheet':
        return (
          <SpreadsheetEditor
            value={content}
            onChange={handleContentChange}
            readOnly={readOnly || isLoading}
          />
        );
      case 'image':
        return (
          <div className="flex items-center justify-center p-4">
            <img
              src={content}
              alt={artifact.title || 'Image'}
              className="max-w-full max-h-[500px] object-contain"
            />
          </div>
        );
      case 'text':
      default:
        return (
          <div className="p-4">
            {readOnly ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-[300px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm">
      {artifact.title && (
        <div className="p-3 border-b bg-gray-50">
          <h3 className="text-lg font-medium">{artifact.title}</h3>
        </div>
      )}
      <div className="flex-1 overflow-auto">{renderContent()}</div>
      {artifact.versions && artifact.versions.length > 0 && (
        <VersionFooter
          version={artifact.currentVersion}
          versions={artifact.versions}
          isLoading={isLoading}
          onVersionChange={onVersionChange}
        />
      )}
    </div>
  );
}
