import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { ExtendedAttachment } from '@/types';
import { notifications } from '@/lib/api-error-handler';

export function useFileUpload(
  onAttachmentsChange: Dispatch<SetStateAction<Array<ExtendedAttachment>>>
) {
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  
  // Handle file uploads
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      // Add to queue
      const newUploadQueue = Array.from(files).map(file => file.name);
      setUploadQueue(prev => [...prev, ...newUploadQueue]);
      
      try {
        const newAttachments: ExtendedAttachment[] = await Promise.all(
          Array.from(files).map(async (file) => {
            // File size check (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`File ${file.name} exceeds 10MB limit`);
            }
            
            // Convert to base64
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            });
            
            // Create attachment with required properties
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64,
              url: URL.createObjectURL(file)
            } as ExtendedAttachment;
          })
        );
        
        // Update attachments using a setter function
        onAttachmentsChange(prevAttachments => [...prevAttachments, ...newAttachments]);
      } catch (error) {
        console.error('Error processing files:', error);
        notifications.error(`Error uploading files: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          id: 'file-upload-error'
        });
      } finally {
        // Clear the input and upload queue
        event.target.value = '';
        setUploadQueue([]);
      }
    },
    [onAttachmentsChange]
  );
  
  return { uploadQueue, handleFileChange };
} 