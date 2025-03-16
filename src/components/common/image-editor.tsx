'use client';

import { useState } from 'react';

interface ImageEditorProps {
  src: string;
  alt?: string;
  onChange?: (src: string) => void;
  readOnly?: boolean;
}

export function ImageEditor({ src, alt = 'Image', onChange, readOnly = false }: ImageEditorProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-md">
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className="max-w-full max-h-[500px] object-contain"
        />
      ) : (
        <div className="w-full h-[300px] bg-muted flex items-center justify-center text-muted-foreground">
          No image available
        </div>
      )}
      
      {!readOnly && onChange && (
        <input 
          type="file" 
          accept="image/*"
          className="w-full"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result && onChange) {
                  onChange(event.target.result as string);
                }
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      )}
    </div>
  );
} 