
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
import type { User, Transaction, AdminWallet } from '@/lib/data';
import { collection, query, where, doc, writeBatch, getDoc, collectionGroup } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

function DepositRequestRow({ tx, user, adminWallets }: { tx: Transaction; user: User | undefined, adminWallets: AdminWallet[] | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleUpdateStatus = async (newStatus: 'completed' | 'failed') => {
    if (!firestore || !user) return;
    setIsProcessing(true);

    const globalTransactionRef = doc(firestore, 'transactions', tx.id);
    const userTransactionRef = doc(firestore, 'users', user.id, 'wallets', 'main', 'transactions', tx.id);
    const walletRef = doc(firestore, 'users', user.id, 'wallets', 'main');

    try {
      const batch = writeBatch(firestore);

      if (newStatus === 'completed') {
        const walletSnapshot = await getDoc(walletRef);
        const walletData = walletSnapshot.data();
        const currentBalance = walletData?.balance || 0;
        batch.update(walletRef, { balance: currentBalance + tx.amount });
      }

      batch.update(globalTransactionRef, { status: newStatus });
      batch.update(userTransactionRef, { status: newStatus });

      await batch.commit();

      toast({
        title: `Request ${newStatus}`,
        description: `The deposit request for ${tx.amount} PKR has been ${newStatus}.`,
      });
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
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
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
            disabled={isProcessing}
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleUpdateStatus('failed')}
            disabled={isProcessing}
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

  const agentDocRef = useMemoFirebase(
    () => (agentUser && firestore ? doc(firestore, 'users', agentUser.uid) : null),
    [agentUser, firestore]
  );
  const { data: agentData, isLoading: isLoadingAgent } = useDoc<User>(agentDocRef);

  const usersQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'users') : null,
    [firestore]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const adminWalletsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'admin_wallets') : null,
    [firestore]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const depositsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      // Agent sees all deposit requests, same as admin
      return query(
        collection(firestore, 'transactions'), 
        where('type', '==', 'deposit'), 
        where('status', '==', 'pending')
      );
    },
    [firestore]
  );
  const { data: depositRequests, isLoading: isLoadingDeposits } = useCollection<Transaction>(depositsQuery);
  
  const findUserForTx = (tx: Transaction) => allUsers?.find(u => u.id === tx.details?.userId);

  const isLoading = isLoadingUsers || isLoadingDeposits || isLoadingAgent || isLoadingWallets;

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
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Review the following deposit requests.</CardDescription>
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
              ) : depositRequests && depositRequests.length > 0 ? (
                depositRequests.map((tx) => (
                  <DepositRequestRow key={tx.id} tx={tx} user={findUserForTx(tx)} adminWallets={adminWallets} />
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
