
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AdminWallet, WithdrawalMethod } from '@/lib/data';
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminWalletPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = React.useState(false);

  // New account form state
  const [newWalletName, setNewWalletName] = React.useState('');
  const [newAccountName, setNewAccountName] = React.useState('');
  const [newWalletAddress, setNewWalletAddress] = React.useState('');
  const [newIsBank, setNewIsBank] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const adminWalletsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'admin_wallets') : null,
    [firestore]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const withdrawalMethodsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'withdrawal_methods') : null,
    [firestore]
  );
  const { data: withdrawalMethods, isLoading: isLoadingMethods } = useCollection<WithdrawalMethod>(withdrawalMethodsQuery);
  
  const handleAddAccount = async () => {
    if (!firestore || !newWalletName || !newAccountName || !newWalletAddress) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill out all fields for the new account.',
      });
      return;
    }
    setIsSaving(true);
    try {
      const newDocRef = doc(collection(firestore, 'admin_wallets'));
      await addDoc(collection(firestore, "admin_wallets"), {
        id: newDocRef.id,
        walletName: newWalletName,
        name: newAccountName,
        number: newWalletAddress,
        isBank: newIsBank,
        isEnabled: true,
      });

      toast({
        title: 'Account Added',
        description: `The account ${newWalletName} has been added.`,
      });
      setIsNewAccountDialogOpen(false);
      // Reset form
      setNewWalletName('');
      setNewAccountName('');
      setNewWalletAddress('');
      setNewIsBank(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding account',
        description: e.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (walletId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'admin_wallets', walletId));
      toast({
        title: 'Account Deleted',
        description: 'The deposit account has been removed.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting account',
        description: e.message,
      });
    }
  };

  const handleToggle = async (collectionName: 'admin_wallets' | 'withdrawal_methods', id: string, isEnabled: boolean) => {
    if(!firestore) return;
    try {
      const docRef = doc(firestore, collectionName, id);
      await updateDoc(docRef, { isEnabled: !isEnabled });
    } catch(e: any) {
       toast({
        variant: 'destructive',
        title: 'Update failed',
        description: `Could not update the setting. ${e.message}`,
      });
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Wallet Settings</h1>
        <p className="text-muted-foreground">
          Manage deposit accounts and available withdrawal methods for users.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Method Settings</CardTitle>
          <CardDescription>Enable or disable withdrawal options for all users.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingMethods ? <p>Loading withdrawal methods...</p> : withdrawalMethods?.map(method => (
            <div key={method.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor={`method-${method.id}`} className="text-base">{method.name}</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to withdraw via {method.name}.
                </p>
              </div>
              <Switch 
                id={`method-${method.id}`} 
                checked={method.isEnabled}
                onCheckedChange={() => handleToggle('withdrawal_methods', method.id, method.isEnabled)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deposit Accounts</CardTitle>
            <CardDescription>
              This information will be shown to users when they want to deposit funds.
            </CardDescription>
          </div>
          <Dialog open={isNewAccountDialogOpen} onOpenChange={setIsNewAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Deposit Account</DialogTitle>
                <DialogDescription>
                  Fill in the details for the new account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-wallet-name">Display Name</Label>
                   <Select value={newWalletName} onValueChange={setNewWalletName}>
                    <SelectTrigger id="new-wallet-name">
                        <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                        <SelectItem value="JazzCash">JazzCash</SelectItem>
                        <SelectItem value="Bank">Bank</SelectItem>
                    </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-name">Account/Bank Name</Label>
                  <Input id="new-account-name" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="e.g., John Doe, Meezan Bank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-wallet-address">Address/Number</Label>
                  <Input id="new-wallet-address" value={newWalletAddress} onChange={e => setNewWalletAddress(e.target.value)} placeholder="Account number or phone number" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="is-bank" checked={newIsBank} onCheckedChange={checked => setNewIsBank(Boolean(checked))} />
                  <Label htmlFor="is-bank">This is a bank account</Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" onClick={handleAddAccount} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {isLoadingWallets ? <p>Loading deposit accounts...</p> : adminWallets?.map((wallet) => (
            <div key={wallet.id} className="rounded-lg border p-4 space-y-4">
               <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`wallet-switch-${wallet.id}`} className="text-base">{wallet.walletName}</Label>
                  <p className="text-sm text-muted-foreground">{wallet.name} - {wallet.number}</p>
                </div>
                <Switch 
                  id={`wallet-switch-${wallet.id}`} 
                  checked={wallet.isEnabled}
                  onCheckedChange={() => handleToggle('admin_wallets', wallet.id, wallet.isEnabled)}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the <strong>{wallet.walletName}</strong> deposit account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDeleteAccount(wallet.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
