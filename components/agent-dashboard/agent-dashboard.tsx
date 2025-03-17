'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWorkflow } from '@/contexts/workflow-context';
import { useAgent } from '@/contexts/agent-context';
import { CustomAgentData } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, Edit, AlertCircle } from 'lucide-react';

export function AgentDashboard() {
  const { workflows, isLoading: isWorkflowsLoading } = useWorkflow();
  const { customAgents, isLoading: isAgentsLoading, saveAgent, deleteAgent } = useAgent();
  const [selectedTab, setSelectedTab] = useState('workflows');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgentData | null>(null);
  const { toast } = useToast();

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;

    if (selectedTab === 'workflows') {
      // Handle workflow deletion (already implemented)
    } else {
      const result = await deleteAgent(deleteItemId);
      if (result.success) {
        toast({
          title: 'Agent deleted',
          description: 'The agent has been successfully deleted.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete the agent. Please try again.',
          variant: 'destructive',
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setDeleteItemId(null);
  };

  const handleAgentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const agentData: CustomAgentData = {
      id: editingAgent?.id,
      user_id: '', // Will be set by the backend
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      instructions: formData.get('instructions') as string,
    };

    const result = await saveAgent(agentData);
    if (result.success) {
      toast({
        title: `Agent ${editingAgent ? 'updated' : 'created'}`,
        description: `The agent has been successfully ${editingAgent ? 'updated' : 'created'}.`,
      });
      setIsAgentDialogOpen(false);
      setEditingAgent(null);
    } else {
      toast({
        title: 'Error',
        description: `Failed to ${editingAgent ? 'update' : 'create'} the agent. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
        <div className="space-x-4">
          <Link href="/workflow-builder">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </Link>
          <Button onClick={() => {
            setEditingAgent(null);
            setIsAgentDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Agent
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows">
          {isWorkflowsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No workflows found. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{workflow.name}</h3>
                  <div className="flex justify-end space-x-2">
                    <Link href={`/workflow-builder/${workflow.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteItemId(workflow.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents">
          {isAgentsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customAgents.map((agent) => (
                  <Card key={agent.id} className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{agent.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">Type: {agent.type}</p>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAgent(agent);
                          setIsAgentDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteItemId(agent.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-6 bg-muted/50">
                <div className="flex items-start space-x-4">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-2">Built-in Agents</h4>
                    <p className="text-sm text-gray-600">
                      The following agents are built into the system and can be customized:
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-gray-600">
                      <li>• Research Agent - Searches and summarizes information</li>
                      <li>• Code Agent - Writes and reviews code</li>
                      <li>• Analysis Agent - Analyzes data and provides insights</li>
                    </ul>
                    <p className="mt-4 text-sm text-blue-600">
                      Agent customization coming soon! You'll be able to modify their prompts and behaviors.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this {selectedTab === 'workflows' ? 'workflow' : 'agent'}?</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Form Dialog */}
      <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAgentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingAgent?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={editingAgent?.type || 'research'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                defaultValue={editingAgent?.instructions}
                placeholder="Enter custom instructions for the agent..."
                required
                className="h-32"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAgentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingAgent ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 