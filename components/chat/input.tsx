import { FormEvent, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading = false }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputRef.current) return;
    const message = inputRef.current.value.trim();
    if (message) {
      onSend(message);
      inputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="mx-auto flex max-w-3xl items-end gap-4 p-4">
        <textarea
          ref={inputRef}
          placeholder="Message Mimir..."
          className="min-h-[60px] w-full resize-none rounded-lg border border-gray-200 p-4 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="flex h-10 items-center rounded-lg bg-violet-600 px-4 font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
} 