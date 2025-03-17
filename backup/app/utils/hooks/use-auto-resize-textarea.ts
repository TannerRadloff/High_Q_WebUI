import { useEffect, RefObject } from 'react';

/**
 * Hook to automatically resize a textarea based on its content
 * @param textareaRef Reference to the textarea element
 * @param value The content of the textarea
 */
export function useAutoResizeTextarea(
  textareaRef: RefObject<HTMLTextAreaElement>,
  value?: string
) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight + 2}px`;
    };

    // Adjust height when value changes
    adjustHeight();

    // Also listen for input events in case value isn't managed by React
    textarea.addEventListener('input', adjustHeight);
    
    return () => {
      textarea.removeEventListener('input', adjustHeight);
    };
  }, [textareaRef, value]);
} 