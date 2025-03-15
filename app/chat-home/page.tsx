'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ChatHomePage() {
  const router = useRouter();
  const [animationComplete, setAnimationComplete] = useState(false);

  // Agent workflow showcase examples
  const workflowExamples = [
    {
      id: 'research',
      title: 'Research & Report',
      description: 'Delegates research tasks to specialized research agents that gather information and hand it off to report writers.',
      icon: '🔍📊',
      color: 'from-blue-500 to-green-500'
    },
    {
      id: 'coding',
      title: 'Code Generation',
      description: 'Specialized coding agents work together to plan, write, and refine code based on your requirements.',
      icon: '💻✨',
      color: 'from-purple-500 to-amber-500'
    },
    {
      id: 'creative',
      title: 'Creative Content',
      description: 'Creative agents collaborate to generate ideas, refine concepts, and produce polished content.',
      icon: '🎨📝',
      color: 'from-pink-500 to-orange-500'
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-screen-xl mx-auto p-4 md:p-8">
        {/* Hero section */}
        <section className="py-12 md:py-20">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">Agent Workflows</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10"
            >
              Harness the power of specialized AI agents working together to accomplish complex tasks
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <button
                onClick={() => router.push('/chat/new')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Start a New Chat
              </button>
              
              <Link 
                href="/agent-builder"
                className="px-8 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Build Your Own Workflow
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Agent workflows showcase */}
        <section className="py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Agent Workflows</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Our agents automatically delegate tasks and collaborate to accomplish your goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {workflowExamples.map((example, index) => (
              <motion.div
                key={example.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden"
              >
                <div className={`h-3 bg-gradient-to-r ${example.color}`}></div>
                <div className="p-6">
                  <div className="text-3xl mb-4">{example.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{example.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    {example.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Our intelligent delegation system routes your task to specialized agents
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            <WorkflowStep 
              number={1} 
              title="Submit Your Request" 
              description="Enter your task or question in the chat interface"
              delay={0.1}
            />
            <WorkflowStep 
              number={2} 
              title="Delegation" 
              description="Your request is analyzed and routed to the appropriate specialist agent"
              delay={0.3}
            />
            <WorkflowStep 
              number={3} 
              title="Collaboration" 
              description="Agents work together, passing information as needed to complete the task"
              delay={0.5}
            />
            <WorkflowStep 
              number={4} 
              title="Results" 
              description="The final response is delivered back to you in the chat"
              delay={0.7}
            />
          </div>
        </section>

        {/* Call to action */}
        <section className="py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: animationComplete ? 1 : 0, y: animationComplete ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl p-10 max-w-3xl mx-auto shadow-2xl"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8">
              Experience the power of specialized AI agents working together
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/chat/new')}
                className="px-8 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Start Chatting Now
              </button>
              <Link
                href="/agent-builder"
                className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all border border-blue-400"
              >
                Build Your Own Agents
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

// Helper component for workflow steps
interface WorkflowStepProps {
  number: number;
  title: string;
  description: string;
  delay?: number;
}

function WorkflowStep({ number, title, description, delay = 0 }: WorkflowStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative flex flex-col items-center"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300 text-center text-sm">
        {description}
      </p>
      
      {/* Connector line (hidden on mobile, visible on md+) */}
      {number < 4 && (
        <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-blue-200 dark:bg-blue-800 -z-10 transform -translate-x-6" />
      )}
    </motion.div>
  );
} 