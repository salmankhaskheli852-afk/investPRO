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
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User, AdminWallet } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ManageAgentAccountsDialogProps {
  agent: User;
  allWallets: AdminWallet[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ManageAgentAccountsDialog({
  agent,
  allWallets,
  isOpen,
  onOpenChange,
}: ManageAgentAccountsDialogProps) {
  const [selectedWallets, setSelectedWallets] = React.useState<string[]>([]);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (agent?.assignedWallets) {
      setSelectedWallets(agent.assignedWallets);
    } else {
      setSelectedWallets([]);
    }
  }, [agent]);

  const handleWalletToggle = (walletId: string) => {
    setSelectedWallets(prev => 
      prev.includes(walletId) 
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };

  const handleSaveChanges = async () => {
    if (!firestore || !agent) return;
    setIsSaving(true);
    const agentRef = doc(firestore, 'users', agent.id);
    try {
      await updateDoc(agentRef, { assignedWallets: selectedWallets });
      toast({
        title: 'Agent Updated',
        description: `Deposit accounts for ${agent.name} have been updated.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating agent',
        description: e.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Accounts for {agent.name}</DialogTitle>
          <DialogDescription>
            Select which deposit accounts this agent is allowed to manage.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {allWallets.map(wallet => (
                <div key={wallet.id} className="flex items-center space-x-3 rounded-md border p-4">
                    <Checkbox
                        id={`wallet-${wallet.id}`}
                        checked={selectedWallets.includes(wallet.id)}
                        onCheckedChange={() => handleWalletToggle(wallet.id)}
                    />
                    <Label htmlFor={`wallet-${wallet.id}`} className="w-full cursor-pointer">
                        <div className="font-medium">{wallet.walletName}</div>
                        <div className="text-sm text-muted-foreground">{wallet.name} - {wallet.number}</div>
                    </Label>
                </div>
            ))}
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
