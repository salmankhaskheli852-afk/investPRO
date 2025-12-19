
'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/data';
import { Label } from '@/components/ui/label';

interface AssignAgentDialogProps {
  user: User;
  agents: User[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AssignAgentDialog({ user, agents, isOpen, onOpenChange }: AssignAgentDialogProps) {
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(user.agentId);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveChanges = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const userRef = doc(firestore, 'users', user.id);
    try {
      await updateDoc(userRef, { agentId: selectedAgentId });
      const agentName = agents.find(a => a.id === selectedAgentId)?.name || 'no one';
      toast({
        title: 'Agent Assigned',
        description: `${user.name} has been assigned to ${agentName}.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error assigning agent',
        description: e.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setSelectedAgentId(user.agentId);
    }
  }, [user]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Agent to {user.name}</DialogTitle>
          <DialogDescription>
            Select an agent to manage this user's account.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor='agent-select'>Agent</Label>
          <Select value={selectedAgentId || ''} onValueChange={(value) => setSelectedAgentId(value === 'none' ? null : value)}>
            <SelectTrigger id="agent-select">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">No Agent (Unassign)</SelectItem>
              {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
