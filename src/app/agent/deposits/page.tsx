
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
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { User, Transaction, AdminWallet, Wallet } from '@/lib/data';
import { collection, query, where, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function DepositRequestRow({ tx, adminWallets, onUpdate }: { tx: Transaction; adminWallets: AdminWallet[] | null, onUpdate: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: agentUser } = useUser();
  const [isProcessing, setIsProcessing] = React.useState(false);

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

  const handleUpdateStatus = async (newStatus: 'completed' | 'failed') => {
    if (!firestore || !user || !agentUser || !tx.details?.tid) return;
    setIsProcessing(true);

    const globalTransactionRef = doc(firestore, 'transactions', tx.id);
    const userTransactionRef = doc(firestore, 'users', user.id, 'wallets', 'main', 'transactions', tx.id);
    const walletRef = doc(firestore, 'users', user.id, 'wallets', 'main');

    try {
        await runTransaction(firestore, async (transaction) => {
            
            // Check for duplicate TID before proceeding
            if (newStatus === 'completed') {
                const completedTxQuery = query(
                    collection(firestore, 'transactions'),
                    where('details.tid', '==', tx.details.tid),
                    where('status', '==', 'completed')
                );
                const completedTxSnapshot = await transaction.get(completedTxQuery);
                if (!completedTxSnapshot.empty) {
                    throw new Error("This Transaction ID has already been processed.");
                }
            }

            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists()) {
                throw new Error("Wallet not found!");
            }
            const currentBalance = walletDoc.data().balance;

            if (newStatus === 'completed') {
                transaction.update(walletRef, { balance: currentBalance + tx.amount });
            }

            const updateData = {
                status: newStatus,
            };

            transaction.update(globalTransactionRef, updateData);
            transaction.update(userTransactionRef, updateData);
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

  const details = tx.details || {};
  const adminWallet = adminWallets?.find(w => w.id === details.adminWalletId);

  return (
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
        <div className="font-medium">{details.senderName}</div>
        <div className="text-sm text-muted-foreground">{details.senderAccount}</div>
        <div className="text-xs text-muted-foreground">TID: {details.tid}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{adminWallet?.walletName || 'N/A'}</div>
        <div className="text-sm text-muted-foreground">{adminWallet?.name}</div>
      </TableCell>
      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}</TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800"
            onClick={() => handleUpdateStatus('completed')}
            disabled={isProcessing || isLoadingUser || isLoadingWallet}
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleUpdateStatus('failed')}
            disabled={isProcessing || isLoadingUser || isLoadingWallet}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AgentDepositsPage() {
  const { user: agentUser } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const agentDocRef = useMemoFirebase(
    () => (agentUser && firestore ? doc(firestore, 'users', agentUser.uid) : null),
    [agentUser, firestore]
  );
  const { data: agentData, isLoading: isLoadingAgent } = useDoc<User>(agentDocRef);

  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && agentUser ? collection(firestore, 'admin_wallets') : null),
    [firestore, agentUser]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const depositsQuery = useMemoFirebase(
    () => {
      if (!firestore || !agentUser) return null;
      // Agent sees all deposit requests, same as admin
      return query(
        collection(firestore, 'transactions'), 
        where('type', '==', 'deposit'), 
        where('status', '==', 'pending')
      );
    },
    [firestore, agentUser]
  );
  const { data: depositRequests, isLoading: isLoadingDeposits, forceRefetch } = useCollection<Transaction>(depositsQuery);
  
  const filteredRequests = React.useMemo(() => {
    if (!depositRequests) return [];
    if (!searchQuery) return depositRequests;
    return depositRequests.filter(tx => 
        tx.details?.tid?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [depositRequests, searchQuery]);

  const isLoading = isLoadingDeposits || isLoadingAgent || isLoadingWallets;

  if (agentData && !agentData.permissions?.canManageDepositRequests) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to manage deposit requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Deposit Requests</h1>
        <p className="text-muted-foreground">Approve or reject user deposit requests.</p>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <div className="flex justify-between items-center">
              <CardDescription>Review the following deposit requests.</CardDescription>
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
                <TableHead>Deposit To</TableHead>
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
                  <DepositRequestRow key={tx.id} tx={tx} adminWallets={adminWallets} onUpdate={forceRefetch} />
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
