import { useState, useCallback, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import type { ExtendedAttachment } from '@/types';
import { showUniqueErrorToast } from '@/lib/api-error-handler';

export function useFileUpload(
  onAttachmentsChange: (attachments: ExtendedAttachment[]) => void
) {
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`[FileUpload] Uploading file: ${file.name} (${file.size} bytes)`);
      
      // Validate file size
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        showUniqueErrorToast(`File ${file.name} is too large. Maximum size is 20MB.`);
        return null;
      }
      
      // Validate file type - add common allowable types
      const allowedTypes = [
        'image/', 'application/pdf', 'text/', 'application/json', 
        'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-'
      ];
      
      const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
      if (!isAllowedType && file.type) {
        console.warn(`[FileUpload] Potentially unsupported file type: ${file.type}`);
        // Just a warning, still allow upload
      }
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;
        
        console.log(`[FileUpload] File uploaded successfully: ${pathname}`);
        
        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      
      const responseData = await response.json().catch(() => ({ error: 'Invalid server response' }));
      const errorMessage = responseData.error || 'Unknown upload error';
      console.error(`[FileUpload] Upload error: ${errorMessage}`);
      showUniqueErrorToast(`Failed to upload ${file.name}: ${errorMessage}`);
      return null;
    } catch (error) {
      console.error(`[FileUpload] Upload exception:`, error);
      showUniqueErrorToast(`Failed to upload ${file.name}. Please try again!`);
      return null;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>, currentAttachments: ExtendedAttachment[]) => {
      const files = Array.from(event.target.files || []);
      
      if (files.length === 0) return;
      
      console.log(`[FileUpload] Processing ${files.length} files`);
      setUploadQueue(files.map((file) => file.name));
      
      try {
        // Process all files
        const validFiles = files.filter(file => {
          // File size validation is already done in uploadFile
          return true;
        });
        
        if (validFiles.length === 0) {
          setUploadQueue([]);
          return;
        }
        
        const uploadPromises = validFiles.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment): attachment is NonNullable<typeof attachment> => 
            attachment !== undefined && attachment !== null
        );
        
        console.log(`[FileUpload] Successfully uploaded ${successfullyUploadedAttachments.length}/${validFiles.length} files`);
        
        if (successfullyUploadedAttachments.length > 0) {
          onAttachmentsChange([
            ...currentAttachments,
            ...successfullyUploadedAttachments,
          ]);
        } else if (validFiles.length > 0) {
          // If we had valid files but none uploaded successfully
          toast.error('Failed to upload files. Please try again.');
        }
      } catch (error) {
        console.error('[FileUpload] Error processing files:', error);
        toast.error('Error uploading files. Please try again.');
      } finally {
        setUploadQueue([]);
        
        // Reset the file input so the same file can be selected again
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [uploadFile, onAttachmentsChange]
  );

  return {
    uploadQueue,
    handleFileChange
  };
} 