
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
import { collection, query, where, doc, writeBatch, getDoc, increment, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Search, MoreHorizontal, Eye, Trash2, ShieldX } from 'lucide-react';
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

function WithdrawalRequestRow({ tx, onUpdate }: { tx: Transaction; onUpdate: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
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
    if (!firestore || !user) return;
    setIsProcessing(true);
    
    const globalTransactionRef = doc(firestore, 'transactions', tx.id);
    const userTransactionRef = doc(firestore, 'users', user.id, 'wallets', 'main', 'transactions', tx.id);
    const walletRef = doc(firestore, 'users', user.id, 'wallets', 'main');

    try {
      const batch = writeBatch(firestore);

      if (newStatus === 'failed') {
        batch.update(walletRef, { balance: increment(tx.amount) });
      }

      batch.update(globalTransactionRef, { status: newStatus });
      batch.update(userTransactionRef, { status: newStatus });

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
        toast({ title: 'Request Deleted', description: 'The withdrawal request has been deleted.' });
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
         {details.method === 'Bank Transfer' && details.bankName && (
          <div className="text-xs text-muted-foreground">{details.bankName}</div>
        )}
        <div className="text-xs capitalize">{details.method}</div>
      </TableCell>
      <TableCell>
        {tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isProcessing}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
             {userId && (
              <DropdownMenuItem asChild>
                <Link href={`/admin/users/${userId}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View User Details
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-green-600 focus:text-green-700"
              onClick={() => handleUpdateStatus('completed')}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </DropdownMenuItem>
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
                    This will mark the request as 'failed' and refund the amount to the user. Are you sure?
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
                    This action cannot be undone and will permanently delete the request. The user's balance will not be refunded.
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
      </TableCell>
    </TableRow>
  );
}

export default function AdminWithdrawalsPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const [searchQuery, setSearchQuery] = React.useState('');

  const withdrawalsQuery = useMemoFirebase(
    () => (firestore && adminUser ? query(collection(firestore, 'transactions'), where('type', '==', 'withdrawal'), where('status', '==', 'pending')) : null),
    [firestore, adminUser]
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
        <p className="text-muted-foreground">Approve or reject user withdrawal requests.</p>
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
                  <WithdrawalRequestRow key={tx.id} tx={tx} onUpdate={forceRefetch}/>
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
