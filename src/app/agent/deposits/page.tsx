
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
import { Check, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [searchQuery, setSearchQuery] = React.useState('');

  const agentDocRef = useMemoFirebase(
    () => (agentUser && firestore ? doc(firestore, 'users', agentUser.uid) : null),
    [agentUser, firestore]
  );
  const { data: agentData, isLoading: isLoadingAgent } = useDoc<User>(agentDocRef);

  const usersQuery = useMemoFirebase(
    () => (firestore && agentUser ? collection(firestore, 'users') : null),
    [firestore, agentUser]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

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
  const { data: depositRequests, isLoading: isLoadingDeposits } = useCollection<Transaction>(depositsQuery);
  
  const findUserForTx = (tx: Transaction) => allUsers?.find(u => u.id === tx.details?.userId);
  
  const filteredRequests = React.useMemo(() => {
    if (!depositRequests) return [];
    if (!searchQuery) return depositRequests;
    return depositRequests.filter(tx => {
        const user = findUserForTx(tx);
        return (
            user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.details?.tid?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });
  }, [depositRequests, searchQuery, allUsers]);

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
          <div className="flex justify-between items-center">
              <CardDescription>Review the following deposit requests.</CardDescription>
              <div className="w-full max-w-sm">
                  <Input
                      placeholder="Search by name, email, or TID..."
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
