# Multimodal Input Component

This directory contains a consolidated implementation of the chat input components that were previously duplicated across the codebase.

## Components

- `MultimodalInput.tsx`: The main component that provides the chat interface with text input, file attachments, and direct/delegated chat mode switching.
- `InputContext.tsx`: Context provider for managing chat input state.
- `hooks/useFileUpload.ts`: Custom hook for handling file uploads.

## Usage

To use the Multimodal Input component in your application:

```tsx
import { MultimodalInput } from '@/components/common/multimodal-input';

function ChatInterface() {
  // Setup required state and handlers
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Array<ExtendedAttachment>>([]);
  const [messages, setMessages] = useState<Array<Message>>([]);
  
  // ... other required props like stop, append, handleSubmit
  
  return (
    <div className="chat-container">
      {/* Other chat components */}
      
      <MultimodalInput
        chatId={chatId}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        append={append}
        handleSubmit={handleSubmit}
        className="my-custom-class"
        selectedWorkflowId={selectedWorkflowId}
      />
    </div>
  );
}
```

## Features

- Text input with auto-resize
- File attachments with previews
- Toggle between direct chat and delegation agent modes
- Keyboard shortcuts (Enter to submit, Escape to stop generation)
- Loading state management
- Responsive design 