
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
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/data';

interface EditUserRoleDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditUserRoleDialog({ user, isOpen, onOpenChange }: EditUserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = React.useState(user.role);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleRoleChange = async () => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'users', user.id);
      const adminRoleRef = doc(firestore, 'roles_admin', user.id);

      // 1. Update the role in the user profile
      batch.update(userRef, { role: selectedRole });

      // 2. Add or remove from roles_admin collection to sync security permissions
      if (selectedRole === 'admin') {
        batch.set(adminRoleRef, { 
            id: user.id, 
            email: user.email, 
            grantedAt: serverTimestamp() 
        });
      } else {
        // If they are no longer an admin, remove the admin flag document
        batch.delete(adminRoleRef);
      }

      await batch.commit();

      toast({
        title: 'Role Updated',
        description: `${user.name}'s role has been changed to ${selectedRole}.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating role',
        description: e.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role for {user.name}</DialogTitle>
          <DialogDescription>
            Select the new role for this user. This will change their access permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'user' | 'agent' | 'admin')}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRoleChange} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
