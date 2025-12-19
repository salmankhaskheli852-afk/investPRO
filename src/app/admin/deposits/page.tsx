
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
import type { User, Transaction, AppSettings } from '@/lib/data';
import { collection, query, where, doc, writeBatch, getDoc, serverTimestamp, getDocs, increment, updateDoc, runTransaction } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function DepositRequestRow({ tx, user, onUpdate }: { tx: Transaction; user: User | undefined, onUpdate: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { user: adminUser } = useUser();
  
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  const handleUpdateStatus = async (newStatus: 'completed' | 'failed') => {
    if (!firestore || !user || !adminUser) return;
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

        // Handle referral commission on first deposit
        if (user.referrerId) {
            // Check if this is the user's first completed deposit
            const userTransactionsQuery = query(collection(firestore, 'users', user.id, 'wallets', 'main', 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'completed'));
            const previousDeposits = await getDocs(userTransactionsQuery);
            
            if (previousDeposits.empty) { // This is the first deposit
                const commissionRate = (appSettings?.referralCommissionPercentage || 0) / 100;
                const commissionAmount = tx.amount * commissionRate;

                if (commissionAmount > 0) {
                    const referrerRef = doc(firestore, 'users', user.referrerId);
                    
                    // Add commission to referrer's income and create transaction
                    await runTransaction(firestore, async (transaction) => {
                        const referrerDoc = await transaction.get(referrerRef);
                        if (!referrerDoc.exists()) {
                            throw "Referrer not found!";
                        }
                        
                        // Update referrer's wallet and user doc
                        const referrerWalletRef = doc(firestore, 'users', user.referrerId!, 'wallets', 'main');
                        const referrerWalletDoc = await transaction.get(referrerWalletRef);
                        const newBalance = (referrerWalletDoc.data()?.balance || 0) + commissionAmount;
                        const newIncome = (referrerDoc.data()?.referralIncome || 0) + commissionAmount;

                        transaction.update(referrerWalletRef, { balance: newBalance });
                        transaction.update(referrerRef, { referralIncome: newIncome });
                        
                        // Create transaction for referrer
                        const referrerTxRef = doc(collection(firestore, 'users', user.referrerId!, 'wallets', 'main', 'transactions'));
                        transaction.set(referrerTxRef, {
                            id: referrerTxRef.id,
                            type: 'referral_income',
                            amount: commissionAmount,
                            status: 'completed',
                            date: serverTimestamp(),
                            walletId: 'main',
                            details: {
                                referredUserId: user.id,
                                referredUserName: user.name,
                                originalDeposit: tx.amount,
                            }
                        });
                    });
                }
            }
        }
      }

      batch.update(globalTransactionRef, { status: newStatus });
      batch.update(userTransactionRef, { status: newStatus });
      
      await batch.commit();

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

export default function AdminDepositsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = React.useState('');

  const usersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users') : null),
    [firestore, user]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const depositsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'pending')) : null),
    [firestore, user]
  );
  const { data: depositRequests, isLoading: isLoadingDeposits, forceRefetch } = useCollection<Transaction>(depositsQuery);
  
  const findUserForTx = (tx: Transaction) => users?.find(u => u.id === tx.details?.userId);

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
  }, [depositRequests, searchQuery, users]);

  const isLoading = isLoadingUsers || isLoadingDeposits;

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
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : filteredRequests && filteredRequests.length > 0 ? (
                filteredRequests.map((tx) => (
                  <DepositRequestRow key={tx.id} tx={tx} user={findUserForTx(tx)} onUpdate={forceRefetch} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
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
