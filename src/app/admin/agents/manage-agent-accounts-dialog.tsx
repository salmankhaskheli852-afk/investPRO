
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
import type { User, AdminWallet, AgentPermissions } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface ManageAgentAccountsDialogProps {
  agent: User;
  allWallets: AdminWallet[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const defaultPermissions: AgentPermissions = {
  canViewDepositHistory: false,
  canViewWithdrawalHistory: false,
  canManageDepositRequests: false,
  canManageWithdrawalRequests: false,
  canAccessLiveChat: false,
  canViewAllUsers: false,
  canViewUserHistory: false,
};

export function ManageAgentAccountsDialog({
  agent,
  allWallets,
  isOpen,
  onOpenChange,
}: ManageAgentAccountsDialogProps) {
  const [selectedWallets, setSelectedWallets] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<AgentPermissions>(defaultPermissions);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (agent) {
      setSelectedWallets(agent.assignedWallets || []);
      // Ensure all permissions are initialized, even if some are missing from the DB
      setPermissions({ ...defaultPermissions, ...(agent.permissions || {}) });
    } else {
      setSelectedWallets([]);
      setPermissions(defaultPermissions);
    }
  }, [agent]);

  const handleWalletToggle = (walletId: string) => {
    setSelectedWallets(prev =>
      prev.includes(walletId)
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };
  
  const handlePermissionToggle = (permission: keyof AgentPermissions, value: boolean) => {
    setPermissions(prev => ({...prev, [permission]: value }));
  };

  const handleSaveChanges = async () => {
    if (!firestore || !agent) return;
    setIsSaving(true);
    const agentRef = doc(firestore, 'users', agent.id);
    try {
      await updateDoc(agentRef, { 
        assignedWallets: selectedWallets,
        permissions: permissions
      });
      toast({
        title: 'Agent Updated',
        description: `Settings for ${agent.name} have been updated.`,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Settings for {agent.name}</DialogTitle>
          <DialogDescription>
            Assign deposit accounts and set permissions for this agent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
            <div>
                <h3 className="mb-4 text-lg font-medium">Assigned Deposit Accounts</h3>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
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
            </div>

            <Separator />

            <div>
                <h3 className="mb-4 text-lg font-medium">Agent Permissions</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="perm-view-all-users" className="flex flex-col space-y-1">
                          <span>View All Users</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                            Allows agent to see all users, not just their assigned ones.
                          </span>
                        </Label>
                        <Switch
                          id="perm-view-all-users"
                          checked={permissions.canViewAllUsers}
                          onCheckedChange={(checked) => handlePermissionToggle('canViewAllUsers', checked)}
                        />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="perm-user-history" className="flex flex-col space-y-1">
                        <span>View User History</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                            Allows agent to search and view user transaction history.
                          </span>
                        </Label>
                        <Switch
                        id="perm-user-history"
                        checked={permissions.canViewUserHistory}
                        onCheckedChange={(checked) => handlePermissionToggle('canViewUserHistory', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="perm-deposit-reqs" className="flex flex-col space-y-1">
                        <span>Manage Deposit Requests</span>
                        </Label>
                        <Switch
                        id="perm-deposit-reqs"
                        checked={permissions.canManageDepositRequests}
                        onCheckedChange={(checked) => handlePermissionToggle('canManageDepositRequests', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="perm-withdrawal-reqs" className="flex flex-col space-y-1">
                        <span>Manage Withdrawal Requests</span>
                        </Label>
                        <Switch
                        id="perm-withdrawal-reqs"
                        checked={permissions.canManageWithdrawalRequests}
                        onCheckedChange={(checked) => handlePermissionToggle('canManageWithdrawalRequests', checked)}
                        />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="perm-deposit-history" className="flex flex-col space-y-1">
                        <span>View Deposit History</span>
                        </Label>
                        <Switch
                        id="perm-deposit-history"
                        checked={permissions.canViewDepositHistory}
                        onCheckedChange={(checked) => handlePermissionToggle('canViewDepositHistory', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="perm-withdrawal-history" className="flex flex-col space-y-1">
                        <span>View Withdrawal History</span>
                        </Label>
                        <Switch
                        id="perm-withdrawal-history"
                        checked={permissions.canViewWithdrawalHistory}
                        onCheckedChange={(checked) => handlePermissionToggle('canViewWithdrawalHistory', checked)}
                        />
                    </div>
                </div>
            </div>
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
