import type { Attachment } from 'ai';
import { ExtendedAttachment } from '@/lib/types';

import { LoaderIcon } from './icons';
import { FileIcon, FileTextIcon, BrainIcon } from 'lucide-react';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;
  const extAttachment = attachment as ExtendedAttachment;
  const hasTextContent = !!extAttachment.textContent;

  return (
    <div className="flex flex-col gap-2">
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="rounded-md size-full object-cover"
            />
          ) : contentType === 'application/pdf' ? (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-full"
            >
              <FileIcon className="h-8 w-8 text-red-500" />
            </a>
          ) : contentType === 'text/plain' ? (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-full"
            >
              <FileTextIcon className="h-8 w-8 text-blue-500" />
            </a>
          ) : (
            <div className="" />
          )
        ) : (
          <div className="" />
        )}

        {isUploading && (
          <div className="animate-spin absolute text-zinc-500">
            <LoaderIcon />
          </div>
        )}
        
        {hasTextContent && (
          <div className="absolute top-0 right-0 bg-primary/80 rounded-bl-md p-0.5">
            <BrainIcon className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
