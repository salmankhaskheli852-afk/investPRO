
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { User, Transaction, Wallet } from '@/lib/data';
import { collection, query, where, doc, writeBatch, getDoc, increment } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function WithdrawalRequestRow({ tx, onUpdate }: { tx: Transaction; onUpdate: () => void }) {
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
    if (!firestore || !user || !agentUser) return;
    setIsProcessing(true);
    
    const globalTransactionRef = doc(firestore, 'transactions', tx.id);
    const userTransactionRef = doc(firestore, 'users', user.id, 'wallets', 'main', 'transactions', tx.id);
    const walletRef = doc(firestore, 'users', user.id, 'wallets', 'main');

    try {
      const batch = writeBatch(firestore);

      // If the request failed, refund the amount to the user's balance.
      if (newStatus === 'failed') {
        batch.update(walletRef, { balance: increment(tx.amount) });
      }
      
      const updateData = {
        status: newStatus,
      };

      batch.update(globalTransactionRef, updateData);
      batch.update(userTransactionRef, updateData);

      await batch.commit();

      toast({
        title: `Request ${newStatus}`,
        description: `The withdrawal request for ${tx.amount} PKR has been ${newStatus}.`,
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
        <div className="font-medium">{details.receiverName}</div>
        <div className="text-sm text-muted-foreground">{details.receiverAccount}</div>
        <div className="text-xs capitalize">{details.method}</div>
      </TableCell>
      <TableCell>
        {tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}
      </TableCell>
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

export default function AgentWithdrawalsPage() {
  const firestore = useFirestore();
  const { user: agentUser } = useUser();
  const [searchQuery, setSearchQuery] = React.useState('');

  const withdrawalsQuery = useMemoFirebase(
    () => (firestore && agentUser ? query(collection(firestore, 'transactions'), where('type', '==', 'withdrawal'), where('status', '==', 'pending')) : null),
    [firestore, agentUser]
  );
  const { data: withdrawalRequests, isLoading: isLoadingWithdrawals, forceRefetch } = useCollection<Transaction>(withdrawalsQuery);
  
  const filteredRequests = React.useMemo(() => {
    if (!withdrawalRequests) return [];
    if (!searchQuery) return withdrawalRequests;
    return withdrawalRequests.filter(tx => 
        tx.details?.receiverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.details?.receiverAccount?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [withdrawalRequests, searchQuery]);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Withdrawal Requests</h1>
        <p className="text-muted-foreground">Approve or reject pending user withdrawal requests.</p>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="rounded-lg">
        <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <div className="flex justify-between items-center">
                <CardDescription>Review the following withdrawal requests.</CardDescription>
                <div className="w-full max-w-sm">
                    <Input
                        placeholder="Search by name or account..."
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
                <TableHead>Account Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingWithdrawals ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : filteredRequests && filteredRequests.length > 0 ? (
                filteredRequests.map((tx) => (
                  <WithdrawalRequestRow key={tx.id} tx={tx} onUpdate={forceRefetch} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No pending withdrawal requests.
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
