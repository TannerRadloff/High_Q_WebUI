'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Import icons from a different package to avoid compatibility issues
import { 
  ChevronRight, 
  Brain, 
  Terminal, 
  Layers, 
  FileText, 
  Search, 
  Settings, 
  GitBranch, 
  Star, 
  Code 
} from '@/components/icons'; // assuming these are available or we can create them

// Define a Badge component with proper TypeScript types
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
}

const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  const baseClass = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };
  return (
    <span className={`${baseClass} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Define agent types and capabilities
const agents = [
  {
    id: 'delegation',
    name: 'Delegation Agent',
    description: 'Automatically routes your requests to specialized agents to handle specific tasks.',
    icon: <Terminal className="h-6 w-6 text-blue-500" />,
    capabilities: ['Task Analysis', 'Agent Selection', 'Request Routing'],
    category: 'orchestration',
    isNew: false,
  },
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Performs comprehensive research on topics and synthesizes information from multiple sources.',
    icon: <Search className="h-6 w-6 text-purple-500" />,
    capabilities: ['Web Search', 'Information Synthesis', 'Citation Management'],
    category: 'knowledge',
    isNew: false,
  },
  {
    id: 'report',
    name: 'Report Agent',
    description: 'Creates well-structured reports and documentation from your research and conversations.',
    icon: <FileText className="h-6 w-6 text-green-500" />,
    capabilities: ['Document Generation', 'Content Formatting', 'Export Options'],
    category: 'productivity',
    isNew: false,
  },
  {
    id: 'judge',
    name: 'Judge Agent',
    description: 'Evaluates information and provides nuanced analysis for decision-making processes.',
    icon: <Layers className="h-6 w-6 text-yellow-500" />,
    capabilities: ['Critical Analysis', 'Evidence Evaluation', 'Balanced Assessment'],
    category: 'knowledge',
    isNew: false,
  },
  {
    id: 'mimir',
    name: 'Mimir Agent',
    description: 'Advanced knowledge system integrating information from multiple sources with contextual awareness.',
    icon: <Brain className="h-6 w-6 text-indigo-500" />,
    capabilities: ['Memory Management', 'Knowledge Integration', 'Context Preservation'],
    category: 'knowledge',
    isNew: true,
  },
  {
    id: 'triage',
    name: 'Triage Agent',
    description: 'Prioritizes and organizes tasks and information based on importance and urgency.',
    icon: <GitBranch className="h-6 w-6 text-rose-500" />,
    capabilities: ['Task Prioritization', 'Issue Classification', 'Workflow Management'],
    category: 'orchestration',
    isNew: false,
  },
  {
    id: 'code',
    name: 'Code Assistant',
    description: 'Specialized in code generation, debugging, and programming assistance.',
    icon: <Code className="h-6 w-6 text-cyan-500" />,
    capabilities: ['Code Generation', 'Bug Detection', 'Refactoring'],
    category: 'productivity',
    isNew: true,
  },
  {
    id: 'custom',
    name: 'Agent Builder',
    description: 'Create your own custom agents with specific tools, instructions, and capabilities.',
    icon: <Settings className="h-6 w-6 text-gray-500" />,
    capabilities: ['Custom Instructions', 'Tool Selection', 'Agent Orchestration'],
    category: 'customization',
    isNew: false,
  },
];

// Group agents by category
const categories = {
  orchestration: { name: 'Orchestration', description: 'Agents that coordinate and manage workflows' },
  knowledge: { name: 'Knowledge', description: 'Agents specialized in research and information processing' },
  productivity: { name: 'Productivity', description: 'Agents that help with tasks and content creation' },
  customization: { name: 'Customization', description: 'Tools to create and customize your own agents' },
};

export default function AgentDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [isAgentCanvasVisible, setIsAgentCanvasVisible] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?from=agent-dashboard');
    }
  }, [user, isLoading, router]);

  const handleAgentSelect = (agentId: string) => {
    localStorage.setItem('selected-agent-id', agentId);
    toast.success(`${agents.find(a => a.id === agentId)?.name} activated!`);
    router.push('/');
  };

  const handleAgentBuilder = () => {
    router.push('/agent-builder');
  };

  const handleShowCanvas = () => {
    setIsAgentCanvasVisible(!isAgentCanvasVisible);
    if (!isAgentCanvasVisible) {
      router.push('/agent-builder/canvas');
    } else {
      setActiveTab('all');
    }
  };

  // Filter agents based on active tab
  const filteredAgents = activeTab === 'all' 
    ? agents 
    : agents.filter(agent => agent.category === activeTab);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to access the Agent Dashboard.</p>
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Brain className="mr-2 h-8 w-8 text-primary" />
            AI Agent Dashboard
          </h1>
          <p className="text-muted-foreground">
            Explore and utilize specialized AI agents to enhance your productivity
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={handleShowCanvas}
            className="flex items-center"
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Agent Workflow Canvas
          </Button>
          <Button 
            onClick={handleAgentBuilder}
            className="flex items-center"
          >
            <Star className="mr-2 h-4 w-4" />
            Create Custom Agent
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Agents</TabsTrigger>
          <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {activeTab !== 'all' && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold">{categories[activeTab as keyof typeof categories].name} Agents</h2>
              <p className="text-muted-foreground">{categories[activeTab as keyof typeof categories].description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="overflow-hidden border border-border hover:border-primary/30 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="p-2 rounded-md bg-background border border-border">
                    {agent.icon}
                  </div>
                  {agent.isNew && (
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">New</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-xl mb-1">{agent.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {agent.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agent.capabilities.map((capability, idx) => (
                      <Badge variant="outline" key={idx}>
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    onClick={() => handleAgentSelect(agent.id)} 
                    className="w-full"
                    variant={agent.id === 'custom' ? 'outline' : 'default'}
                  >
                    {agent.id === 'custom' ? 'Configure' : 'Use Agent'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-2xl font-bold mb-4">Agent Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-border">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <Terminal className="mr-2 h-5 w-5 text-primary" />
              Tool Integration
            </h3>
            <p className="text-muted-foreground">
              Agents can integrate with various tools and APIs to perform actions like web searches, 
              retrieving data, and connecting to external services.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <GitBranch className="mr-2 h-5 w-5 text-primary" />
              Agent Orchestration
            </h3>
            <p className="text-muted-foreground">
              Connect multiple agents together in workflows to handle complex tasks by delegating to specialized 
              agents for each sub-task.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <Brain className="mr-2 h-5 w-5 text-primary" />
              Memory & Context
            </h3>
            <p className="text-muted-foreground">
              Agents maintain conversational memory and context awareness to provide more 
              relevant and personalized responses over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 