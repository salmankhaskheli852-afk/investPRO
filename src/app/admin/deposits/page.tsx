
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { User, Transaction, AppSettings, AdminWallet, Wallet } from '@/lib/data';
import { collection, query, where, doc, writeBatch, getDoc, serverTimestamp, getDocs, increment, updateDoc, runTransaction, deleteDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Search, Copy, MoreHorizontal, Eye, Trash2, ShieldX, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import Link from 'next/link';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';


function EditSenderDetailsDialog({
  isOpen,
  onOpenChange,
  transaction,
  onSuccess
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  onSuccess: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [senderName, setSenderName] = React.useState(transaction.details?.senderName || '');
  const [senderAccount, setSenderAccount] = React.useState(transaction.details?.senderAccount || '');
  const [tid, setTid] = React.useState(transaction.details?.tid || '');

  React.useEffect(() => {
    if (transaction) {
      setSenderName(transaction.details?.senderName || '');
      setSenderAccount(transaction.details?.senderAccount || '');
      setTid(transaction.details?.tid || '');
    }
  }, [transaction])

  const handleSaveChanges = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const globalTransactionRef = doc(firestore, 'transactions', transaction.id);

    try {
      await updateDoc(globalTransactionRef, {
        'details.senderName': senderName,
        'details.senderAccount': senderAccount,
        'details.tid': tid,
      });

      // Also update user's transaction if it exists (might not for older data)
      if (transaction.details?.userId) {
          const userTransactionRef = doc(firestore, 'users', transaction.details.userId, 'wallets', 'main', 'transactions', transaction.id);
          await updateDoc(userTransactionRef, {
            'details.senderName': senderName,
            'details.senderAccount': senderAccount,
            'details.tid': tid,
          }).catch(() => { /* Ignore if it fails, global is more important */});
      }

      toast({
        title: 'Details Updated',
        description: 'The sender details have been successfully updated.',
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating details',
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
                <DialogTitle>Edit Sender Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input id="sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sender-account">Sender Account</Label>
                    <Input id="sender-account" value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tid">Transaction ID (TID)</Label>
                    <Input id="tid" value={tid} onChange={(e) => setTid(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  )

}


function DepositRequestRow({ tx, onUpdate, adminWallets }: { tx: Transaction; onUpdate: () => void, adminWallets: AdminWallet[] | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const { user: adminUser } = useUser();
  
  const userId = tx.details?.userId;

  const userDocRef = useMemoFirebase(
    () => (firestore && userId ? doc(firestore, 'users', userId) : null),
    [firestore, userId]
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const walletDocRef = useMemoFirebase(
    () => (firestore && userId ? doc(firestore, 'users', userId, 'wallets', 'main') : null),
    [firestore, userId]
  );
  const { data: wallet, isLoading: isLoadingWallet } = useDoc<Wallet>(walletDocRef);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);
  
  const handleCopy = () => {
    const tidToCopy = tx.details?.tid || '';
    if (tidToCopy) {
      navigator.clipboard.writeText(tidToCopy);
      toast({
        title: 'TID Copied!',
        description: 'Transaction ID has been copied to your clipboard.',
      });
    }
  };

  const handleUpdateStatus = async (newStatus: 'completed' | 'failed') => {
    if (!firestore || !user || !adminUser || !tx.details?.tid) return;
    setIsProcessing(true);

    const globalTransactionRef = doc(firestore, 'transactions', tx.id);
    const userTransactionRef = doc(firestore, 'users', user.id, 'wallets', 'main', 'transactions', tx.id);
    const walletRef = doc(firestore, 'users', user.id, 'wallets', 'main');
    const userRef = doc(firestore, 'users', user.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            // --- PRE-CHECKS ---
            if (newStatus === 'completed') {
                const completedTxQuery = query(
                    collection(firestore, 'transactions'), 
                    where('details.tid', '==', tx.details.tid),
                    where('status', '==', 'completed')
                );
                const completedTxSnapshot = await getDocs(completedTxQuery);
                if (!completedTxSnapshot.empty) {
                    throw new Error("This Transaction ID has already been processed.");
                }
            }
            
            // --- DATA FETCHING (within transaction) ---
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found!");
            const currentUserData = userDoc.data() as User;

            // --- LOGIC & BATCH WRITES ---
            if (newStatus === 'completed') {
                // 1. Update user's balance
                transaction.update(walletRef, { balance: increment(tx.amount) });

                // 2. Denormalize totalDeposit on user profile
                const isFirstDeposit = !currentUserData.totalDeposit || currentUserData.totalDeposit === 0;
                const newTotalDeposit = (currentUserData.totalDeposit || 0) + tx.amount;
                transaction.update(userRef, { totalDeposit: newTotalDeposit });

                // 3. Handle account verification on first deposit
                if (isFirstDeposit && appSettings?.isVerificationEnabled && !currentUserData.isVerified) {
                    if (tx.amount >= (appSettings.verificationDepositAmount || 0)) {
                        transaction.update(userRef, { isVerified: true });
                    }
                }
                
                // 4. Handle First Deposit Bonus
                if (isFirstDeposit && appSettings?.firstDepositBonus && appSettings.firstDepositBonus > 0) {
                    if(tx.amount >= (appSettings.minFirstDepositForBonus || 0)) {
                        const bonusAmount = appSettings.firstDepositBonus;
                        transaction.update(walletRef, { balance: increment(bonusAmount) });
                        
                        const bonusTxRef = doc(collection(firestore, 'users', user.id, 'wallets', 'main', 'transactions'));
                        transaction.set(bonusTxRef, {
                             id: bonusTxRef.id,
                             type: 'first_deposit_bonus',
                             amount: bonusAmount,
                             status: 'completed',
                             date: serverTimestamp(),
                             walletId: 'main',
                             details: { reason: `Bonus for first deposit of ${tx.amount} PKR` }
                        });
                    }
                }


                // 5. Handle referral commission on FIRST deposit
                if (isFirstDeposit && currentUserData.referrerId && appSettings?.referralCommissionPercentage) {
                    const commissionRate = appSettings.referralCommissionPercentage / 100;
                    const commissionAmount = tx.amount * commissionRate;

                    if (commissionAmount > 0) {
                        const referrerWalletRef = doc(firestore, 'users', currentUserData.referrerId, 'wallets', 'main');
                        transaction.update(referrerWalletRef, { balance: increment(commissionAmount) });

                        const referrerTxRef = doc(collection(firestore, 'users', currentUserData.referrerId, 'wallets', 'main', 'transactions'));
                        transaction.set(referrerTxRef, {
                            id: referrerTxRef.id,
                            type: 'referral_income',
                            amount: commissionAmount,
                            status: 'completed',
                            date: serverTimestamp(),
                            walletId: 'main',
                            details: {
                                reason: `Commission from ${currentUserData.name}'s first deposit`,
                                referredUserId: currentUserData.id,
                                depositAmount: tx.amount,
                            }
                        });
                    }
                }
            }
            
            // 6. Update transaction status in both locations
            transaction.update(globalTransactionRef, { status: newStatus });
            transaction.set(userTransactionRef, { status: newStatus }, { merge: true });
        });

        toast({
            title: `Request ${newStatus}`,
            description: `The deposit request for ${tx.amount} PKR has been ${newStatus}.`,
        });
        onUpdate();

    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Error updating status',
            description: e.message || 'Could not update the transaction status.',
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !user) return;
    setIsProcessing(true);
    const globalTransactionRef = doc(firestore, 'transactions', tx.id);
    const userTransactionRef = doc(firestore, 'users', user.id, 'wallets', 'main', 'transactions', tx.id);
    
    try {
        const batch = writeBatch(firestore);
        batch.delete(globalTransactionRef);
        batch.delete(userTransactionRef);
        await batch.commit();
        toast({ title: 'Request Deleted', description: 'The deposit request has been deleted.' });
        onUpdate();
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Error deleting request',
            description: e.message
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const details = tx.details || {};
  const depositToWallet = adminWallets?.find(w => w.id === details.adminWalletId);

  return (
    <>
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0) ?? '?'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user?.name ?? '...'}</div>
            <div className="text-sm text-muted-foreground">{user?.email ?? '...'}</div>
            <div className="text-xs text-muted-foreground">
              Balance: {(wallet?.balance ?? 0).toLocaleString()} PKR
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
      <TableCell>
        <div>
            <div className="font-medium">{details.senderName}</div>
            <div className="text-sm text-muted-foreground">{details.senderAccount}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>TID: {details.tid}</span>
                 <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCopy}>
                    <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="h-3 w-3" />
                </Button>
            </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{depositToWallet?.walletName}</div>
        <div className="text-sm text-muted-foreground">{depositToWallet?.name}</div>
      </TableCell>
      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}</TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800"
            onClick={() => handleUpdateStatus('completed')}
            disabled={isProcessing || isLoadingUser}
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleUpdateStatus('failed')}
            disabled={isProcessing || isLoadingUser}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isProcessing}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>More Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userId && (
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${userId}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View User Details
                  </Link>
                </DropdownMenuItem>
              )}
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                    <ShieldX className="mr-2 h-4 w-4" />
                    Mark as Fake
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark as Fake?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the request as 'failed'. This action is the same as Reject and is permanent.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleUpdateStatus('failed')}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone and will permanently delete the request.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
    {isEditDialogOpen && (
        <EditSenderDetailsDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          transaction={tx}
          onSuccess={onUpdate}
        />
    )}
    </>
  );
}


export default function AdminDepositsPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Pending deposits query
  const depositsQuery = useMemoFirebase(
    () => (firestore && adminUser ? query(collection(firestore, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'pending')) : null),
    [firestore, adminUser]
  );
  const { data: depositRequests, isLoading: isLoadingDeposits, forceRefetch } = useCollection<Transaction>(depositsQuery);
  
  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && adminUser ? collection(firestore, 'admin_wallets') : null),
    [firestore, adminUser]
  );
  const { data: adminWallets, isLoading: isLoadingAdminWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const filteredRequests = React.useMemo(() => {
    if (!depositRequests) return [];
    if (!searchQuery) return depositRequests;
    return depositRequests.filter(tx => 
        tx.details?.tid?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [depositRequests, searchQuery]);

  const isLoading = isLoadingDeposits || isLoadingAdminWallets;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Deposit Requests</h1>
        <p className="text-muted-foreground">Approve, reject, and view the history of user deposit requests.</p>
      </div>
      
       <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500 mt-4">
        <Card className="rounded-lg">
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div >
                      <CardTitle>Pending Requests</CardTitle>
                      <CardDescription>Review the following deposit requests.</CardDescription>
                  </div>
                    <div className="w-full max-w-sm">
                      <Input
                          placeholder="Search by TID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          icon={<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
                      />
                  </div>
              </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sender Details</TableHead>
                  <TableHead>Deposit To Detail</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests && filteredRequests.length > 0 ? (
                  filteredRequests.map((tx) => (
                    <DepositRequestRow key={tx.id} tx={tx} onUpdate={forceRefetch} adminWallets={adminWallets} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No pending deposit requests.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
    </div>
  );
}
