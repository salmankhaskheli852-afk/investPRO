
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Edit, Trash2, RefreshCcw, Users, GitBranch, Wallet as WalletIcon } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { User, Transaction, Wallet, InvestmentPlan } from '@/lib/data';
import { collection, doc, query, orderBy, writeBatch, serverTimestamp, addDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { format } from 'date-fns';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { useParams } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal } from 'lucide-react';

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isStatEditDialogOpen, setIsStatEditDialogOpen] = React.useState(false);
  const [editingStatField, setEditingStatField] = React.useState<{ title: string; value: number; field: string } | null>(null);
  const [newStatValue, setNewStatValue] = React.useState('');

  const [isTxEditDialogOpen, setIsTxEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [editedTxAmount, setEditedTxAmount] = React.useState('');
  const [editedTxType, setEditedTxType] = React.useState('');
  const [editedTxStatus, setEditedTxStatus] = React.useState('');

  const userDocRef = useMemoFirebase(
      () => firestore && userId ? doc(firestore, 'users', userId) : null,
      [firestore, userId]
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userDocRef);
  
  const walletDocRef = useMemoFirebase(
    () => firestore && userId ? doc(firestore, 'users', userId, 'wallets', 'main') : null,
    [firestore, userId]
  );
  const { data: wallet, isLoading: isLoadingWallet } = useDoc<Wallet>(walletDocRef);

  const transactionsQuery = useMemoFirebase(
      () => firestore && userId
        ? query(
            collection(firestore, 'users', userId, 'wallets', 'main', 'transactions'),
            orderBy('date', 'desc')
          )
        : null,
      [firestore, userId]
  );
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const plansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: allPlans, isLoading: isLoadingPlans } = useCollection<InvestmentPlan>(plansQuery);

  const transactionTotals = React.useMemo(() => {
    if (!transactions) return { deposit: 0, withdraw: 0, income: 0, investment: 0, referral_income: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit') acc.deposit += tx.amount;
        else if (tx.type === 'withdrawal') acc.withdraw += tx.amount;
        else if (tx.type === 'investment') acc.investment += tx.amount;
      }
      return acc;
    }, { deposit: 0, withdraw: 0, income: 0, investment: 0, referral_income: 0 });
  }, [transactions]);
  
  const purchasedPlansCount = user?.investments?.length || 0;

  const isLoading = isLoadingUser || isLoadingWallet || isLoadingTransactions || isLoadingPlans;

  const handleEditStatClick = (title: string, value: number, field: string) => {
    setEditingStatField({ title, value, field });
    setNewStatValue(String(value));
    setIsStatEditDialogOpen(true);
  };
  
  const handleSaveStatChanges = async () => {
    if (!editingStatField || !firestore || !userId || !userDocRef || !walletDocRef) return;

    const numericNewValue = parseFloat(newStatValue);
    if (isNaN(numericNewValue)) {
      toast({ variant: 'destructive', title: 'Invalid value', description: 'Please enter a valid number.' });
      return;
    }

    try {
        await updateDoc(walletDocRef, { [editingStatField.field]: numericNewValue });
        toast({ title: 'Success', description: `${editingStatField.title} has been updated.` });
        setIsStatEditDialogOpen(false);
        setEditingStatField(null);
    } catch (e: any) {
       toast({ variant: 'destructive', title: 'Error updating value', description: e.message });
    }
  };

  const handleEditTxClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditedTxAmount(String(tx.amount));
    setEditedTxType(tx.type);
    setEditedTxStatus(tx.status);
    setIsTxEditDialogOpen(true);
  };
  
  const handleSaveTxChanges = async () => {
    // This function is complex and needs careful review of the balance logic.
    // Disabling for now to prevent accidental balance corruption.
    toast({ variant: 'destructive', title: 'Not Implemented', description: 'Editing transactions is temporarily disabled.' });
  };

  const handleDeleteTx = async (tx: Transaction) => {
    if (!firestore || !userId || !wallet) return;

    try {
        const batch = writeBatch(firestore);
        const txRef = doc(firestore, 'users', userId, 'wallets', 'main', 'transactions', tx.id);
        const walletRef = doc(firestore, 'users', userId, 'wallets', 'main');

        if(tx.status === 'completed') {
            if (tx.type === 'deposit') {
                batch.update(walletRef, { depositBalance: increment(-tx.amount) });
            } else if (tx.type === 'referral_income' || tx.type === 'income') {
                batch.update(walletRef, { earningBalance: increment(-tx.amount) });
            } else if (tx.type === 'withdrawal' || tx.type === 'investment') {
                // Assuming withdrawal/investment come from earning/deposit balances respectively
                // This part is complex and depends on which balance they are drawn from.
                // For simplicity, we assume withdrawal from earning, investment from deposit.
                if (tx.type === 'withdrawal') batch.update(walletRef, { earningBalance: increment(tx.amount) });
                if (tx.type === 'investment') batch.update(walletRef, { depositBalance: increment(tx.amount) });
            }
        }
        
        batch.delete(txRef);
        await batch.commit();

        toast({ title: 'Transaction deleted' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error deleting transaction', description: e.message });
    }
  };

  const handleRevokeDeposit = async (tx: Transaction) => {
    if (!firestore || !userId) return;
    try {
        const batch = writeBatch(firestore);
        const txRef = doc(firestore, 'users', userId, 'wallets', 'main', 'transactions', tx.id);
        const walletRef = doc(firestore, 'users', userId, 'wallets', 'main');

        batch.update(txRef, { status: 'revoked' });
        batch.update(walletRef, { depositBalance: increment(-tx.amount) });

        const revokedTxRef = doc(collection(firestore, 'users', userId, 'wallets', 'main', 'transactions'));
        batch.set(revokedTxRef, {
            id: revokedTxRef.id,
            type: 'deposit',
            amount: -tx.amount,
            status: 'revoked',
            date: serverTimestamp(),
            details: { reason: `Revoked TID: ${tx.details?.tid}`, originalTxId: tx.id },
            walletId: 'main'
        });
        
        await batch.commit();
        toast({ title: 'Deposit Revoked', description: `Successfully revoked deposit of ${tx.amount} PKR.`});
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error revoking deposit', description: e.message });
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700';
      case 'pending':
        return 'bg-amber-500/20 text-amber-700';
      case 'failed':
        return 'bg-red-500/20 text-red-700';
      case 'revoked':
          return 'bg-gray-500/20 text-gray-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Loading user details...</p>
        </div>
    )
  }

  if (!user) {
    return (
      <div className='text-center'>
        <h1 className="text-3xl font-bold font-headline">User not found</h1>
        <Link href="/admin/users">
            <Button variant="link">Go back to user list</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
           <Avatar className='h-16 w-16'>
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className='text-2xl'>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-3xl font-bold font-headline">{user.name}</h1>
                <p className="text-muted-foreground">{user.email}</p>
            </div>
        </div>
       </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardStatsCard
          title="Deposit Balance"
          value={`${(wallet?.depositBalance || 0).toLocaleString()} PKR`}
          description="For purchasing plans"
          Icon={WalletIcon}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Deposit Balance', wallet?.depositBalance || 0, 'depositBalance')}
        />
        <DashboardStatsCard
          title="Earning Balance"
          value={`${(wallet?.earningBalance || 0).toLocaleString()} PKR`}
          description="Withdrawable funds"
          Icon={PiggyBank}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Earning Balance', wallet?.earningBalance || 0, 'earningBalance')}
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`${transactionTotals.investment.toLocaleString()} PKR`}
          description={`${purchasedPlansCount} active plans`}
          Icon={TrendingUp}
          chartData={[]} chartKey=''
        />
         <DashboardStatsCard
          title="Total Deposit"
          value={`${transactionTotals.deposit.toLocaleString()} PKR`}
          description="Funds added"
          Icon={ArrowDownToLine}
          chartData={[]} chartKey=''
        />
        <DashboardStatsCard
          title="Total Withdraw"
          value={`${transactionTotals.withdraw.toLocaleString()} PKR`}
          description="Funds taken out"
          Icon={ArrowUpFromLine}
          chartData={[]} chartKey=''
        />
      </div>


      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card>
        <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>A complete record of this user's financial activities.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : transactions && transactions.length > 0 ? (
                transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
                      <TableCell>{tx.details?.planName || tx.details?.method || tx.details?.reason || tx.details?.tid || 'N/A'}</TableCell>
                      <TableCell>{tx.amount.toLocaleString()} PKR</TableCell>
                      <TableCell>
                         <Badge
                            variant='outline'
                            className={getStatusBadge(tx.status)}
                        >
                            {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPpp') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTxClick(tx)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              {tx.type === 'deposit' && tx.status === 'completed' && (
                                <>
                                 <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                        Revoke Deposit
                                      </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Revoke this deposit?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will deduct {tx.amount} PKR from the user's deposit balance. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive hover:bg-destructive/90"
                                          onClick={() => handleRevokeDeposit(tx)}
                                        >
                                          Confirm Revoke
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}

                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the transaction and may adjust the user's wallet balance.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTx(tx)}>Continue</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No transaction history found for this user.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
      
       <Dialog open={isStatEditDialogOpen} onOpenChange={setIsStatEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingStatField?.title}</DialogTitle>
            <DialogDescription>
              Enter the new value. This will be reflected in the user's account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-value">New Value (PKR)</Label>
            <Input
              id="new-value"
              type="number"
              value={newStatValue}
              onChange={(e) => setNewStatValue(e.target.value)}
              placeholder={`Enter new ${editingStatField?.title.toLowerCase()}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStatChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingTransaction && (
         <Dialog open={isTxEditDialogOpen} onOpenChange={setIsTxEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Modify the transaction details below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="tx-amount">Amount (PKR)</Label>
                    <Input id="tx-amount" type="number" value={editedTxAmount} onChange={e => setEditedTxAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tx-type">Type</Label>
                    <Select value={editedTxType} onValueChange={setEditedTxType}>
                        <SelectTrigger id="tx-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="deposit">Deposit</SelectItem>
                            <SelectItem value="withdrawal">Withdrawal</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="referral_income">Referral Income</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tx-status">Status</Label>
                    <Select value={editedTxStatus} onValueChange={setEditedTxStatus}>
                        <SelectTrigger id="tx-status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveTxChanges}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
