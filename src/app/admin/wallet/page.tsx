
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { AdminWallet, WithdrawalMethod } from '@/lib/data';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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

const METHOD_NAMES = {
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'Easypaisa',
  BANK_TRANSFER: 'Bank Transfer'
};

const METHOD_IDS = {
  JAZZCASH: 'jazzcash',
  EASYPAISA: 'easypaisa',
  BANK_TRANSFER: 'bank-transfer'
};


export default function AdminWalletPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = React.useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = React.useState(false);

  // New account form state
  const [newWalletName, setNewWalletName] = React.useState('');
  const [newAccountName, setNewAccountName] = React.useState('');
  const [newWalletAddress, setNewWalletAddress] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingMethods, setIsSavingMethods] = React.useState(false);

  // Edit account form state
  const [editingWallet, setEditingWallet] = React.useState<AdminWallet | null>(null);
  const [editWalletName, setEditWalletName] = React.useState('');
  const [editAccountName, setEditAccountName] = React.useState('');
  const [editWalletAddress, setEditWalletAddress] = React.useState('');

  // State for withdrawal method toggles
  const [methodsState, setMethodsState] = React.useState<Record<string, boolean>>({
    [METHOD_IDS.JAZZCASH]: false,
    [METHOD_IDS.EASYPAISA]: false,
    [METHOD_IDS.BANK_TRANSFER]: false,
  });

  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'admin_wallets') : null),
    [firestore, user]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const withdrawalMethodsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'withdrawal_methods') : null),
    [firestore, user]
  );
  const { data: withdrawalMethods, isLoading: isLoadingMethods } = useCollection<WithdrawalMethod>(withdrawalMethodsQuery);
  
  React.useEffect(() => {
    if (withdrawalMethods) {
      const initialState: Record<string, boolean> = {
        [METHOD_IDS.JAZZCASH]: false,
        [METHOD_IDS.EASYPAISA]: false,
        [METHOD_IDS.BANK_TRANSFER]: false,
      };
      withdrawalMethods.forEach(method => {
        initialState[method.id] = method.isEnabled;
      });
      setMethodsState(initialState);
    }
  }, [withdrawalMethods]);

  const handleMethodStateChange = (methodId: string, isEnabled: boolean) => {
    setMethodsState(prev => ({ ...prev, [methodId]: isEnabled }));
  };

  const handleSaveMethods = async () => {
    if (!firestore) return;
    setIsSavingMethods(true);
    try {
      const batch = writeBatch(firestore);
      
      const jazzcashRef = doc(firestore, 'withdrawal_methods', METHOD_IDS.JAZZCASH);
      batch.set(jazzcashRef, { id: METHOD_IDS.JAZZCASH, name: METHOD_NAMES.JAZZCASH, isEnabled: methodsState[METHOD_IDS.JAZZCASH] }, { merge: true });

      const easypaisaRef = doc(firestore, 'withdrawal_methods', METHOD_IDS.EASYPAISA);
      batch.set(easypaisaRef, { id: METHOD_IDS.EASYPAISA, name: METHOD_NAMES.EASYPAISA, isEnabled: methodsState[METHOD_IDS.EASYPAISA] }, { merge: true });

      const bankRef = doc(firestore, 'withdrawal_methods', METHOD_IDS.BANK_TRANSFER);
      batch.set(bankRef, { id: METHOD_IDS.BANK_TRANSFER, name: METHOD_NAMES.BANK_TRANSFER, isEnabled: methodsState[METHOD_IDS.BANK_TRANSFER] }, { merge: true });

      await batch.commit();

      toast({
        title: 'Settings Saved',
        description: 'Withdrawal methods have been updated.',
      });

    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving',
        description: e.message,
      });
    } finally {
      setIsSavingMethods(false);
    }
  };


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
      await setDoc(newDocRef, {
        id: newDocRef.id,
        walletName: newWalletName,
        name: newAccountName,
        number: newWalletAddress,
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
  
  const handleEditAccountClick = (wallet: AdminWallet) => {
    setEditingWallet(wallet);
    setEditWalletName(wallet.walletName);
    setEditAccountName(wallet.name);
    setEditWalletAddress(wallet.number);
    setIsEditAccountDialogOpen(true);
  };

  const handleUpdateAccount = async () => {
    if (!firestore || !editingWallet || !editWalletName || !editAccountName || !editWalletAddress) {
        toast({ variant: 'destructive', title: 'Missing fields' });
        return;
    }
    setIsSaving(true);
    try {
        const walletRef = doc(firestore, 'admin_wallets', editingWallet.id);
        await updateDoc(walletRef, {
            walletName: editWalletName,
            name: editAccountName,
            number: editWalletAddress,
        });
        toast({ title: 'Account Updated', description: 'The account details have been saved.' });
        setIsEditAccountDialogOpen(false);
        setEditingWallet(null);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error updating account', description: e.message });
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

  const handleToggleAccount = async (id: string, isEnabled: boolean) => {
    if(!firestore) return;
    try {
      const docRef = doc(firestore, 'admin_wallets', id);
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
      
      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="rounded-lg">
        <CardHeader>
            <CardTitle>Withdrawal Method Settings</CardTitle>
            <CardDescription>Enable or disable withdrawal options for all users.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoadingMethods ? <p>Loading withdrawal methods...</p> : (
              <>
                <div className="flex flex-col justify-between rounded-lg border p-4 space-y-4">
                  <Label htmlFor="method-jazzcash" className="text-base font-medium">{METHOD_NAMES.JAZZCASH}</Label>
                  <Switch 
                    id="method-jazzcash" 
                    checked={methodsState[METHOD_IDS.JAZZCASH]}
                    onCheckedChange={(checked) => handleMethodStateChange(METHOD_IDS.JAZZCASH, checked)}
                  />
                </div>
                <div className="flex flex-col justify-between rounded-lg border p-4 space-y-4">
                  <Label htmlFor="method-easypaisa" className="text-base font-medium">{METHOD_NAMES.EASYPAISA}</Label>
                  <Switch 
                    id="method-easypaisa" 
                    checked={methodsState[METHOD_IDS.EASYPAISA]}
                    onCheckedChange={(checked) => handleMethodStateChange(METHOD_IDS.EASYPAISA, checked)}
                  />
                </div>
                <div className="flex flex-col justify-between rounded-lg border p-4 space-y-4">
                  <Label htmlFor="method-bank" className="text-base font-medium">{METHOD_NAMES.BANK_TRANSFER}</Label>
                  <Switch 
                    id="method-bank" 
                    checked={methodsState[METHOD_IDS.BANK_TRANSFER]}
                    onCheckedChange={(checked) => handleMethodStateChange(METHOD_IDS.BANK_TRANSFER, checked)}
                  />
                </div>
              </>
            )}
        </CardContent>
         <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveMethods} disabled={isSavingMethods || isLoadingMethods}>
              {isSavingMethods ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
      </Card>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="rounded-lg">
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
                  onCheckedChange={() => handleToggleAccount(wallet.id, wallet.isEnabled)}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                 <Button variant="ghost" size="icon" onClick={() => handleEditAccountClick(wallet)}>
                    <Edit className="h-4 w-4" />
                  </Button>
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

      {editingWallet && (
         <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Deposit Account</DialogTitle>
                <DialogDescription>
                  Update the details for this account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-wallet-name">Display Name</Label>
                   <Select value={editWalletName} onValueChange={setEditWalletName}>
                    <SelectTrigger id="edit-wallet-name">
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
                  <Label htmlFor="edit-account-name">Account/Bank Name</Label>
                  <Input id="edit-account-name" value={editAccountName} onChange={e => setEditAccountName(e.target.value)} placeholder="e.g., John Doe, Meezan Bank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-wallet-address">Address/Number</Label>
                  <Input id="edit-wallet-address" value={editWalletAddress} onChange={e => setEditWalletAddress(e.target.value)} placeholder="Account number or phone number" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" onClick={handleUpdateAccount} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

    </div>
  );
}

    