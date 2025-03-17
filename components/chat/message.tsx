interface MessageProps {
  sender: 'user' | 'mimir' | 'agent';
  agentName?: string;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  workflowId?: string;
}

export function Message({ 
  sender, 
  agentName, 
  content, 
  timestamp, 
  isLoading = false,
  workflowId
}: MessageProps) {
  const displayName = sender === 'agent' && agentName ? agentName : sender === 'mimir' ? 'Mimir' : 'You';
  const isUser = sender === 'user';
  
  return (
    <div className={`flex w-full ${!isUser ? 'bg-gray-50' : 'bg-white'} p-8`}>
      <div className="mx-auto flex w-full max-w-3xl items-start gap-4">
        <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md ${
          isUser ? 'bg-black text-white' : 
          sender === 'mimir' ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white' : 
          'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
        }`}>
          {isUser ? 'U' : sender === 'mimir' ? 'M' : 'A'}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-900">
              {displayName}
            </p>
            <span className="ml-2 text-xs text-gray-500">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {workflowId && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                Workflow
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            {isLoading ? (
              <ThinkingIndicator />
            ) : (
              <p>{content}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-500">Thinking</span>
      <span className="flex space-x-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }}></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }}></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }}></span>
      </span>
    </div>
  );
} 