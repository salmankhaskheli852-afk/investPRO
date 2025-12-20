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
import { ArrowLeft, DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Edit, Trash2, RefreshCcw, Users, GitBranch } from 'lucide-react';
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
    if (!transactions) return { deposit: 0, withdraw: 0, income: 0, investment: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit') acc.deposit += tx.amount;
        else if (tx.type === 'withdrawal') acc.withdraw += tx.amount;
        else if (tx.type === 'income') acc.income += tx.amount;
        else if (tx.type === 'investment') acc.investment += tx.amount;
      }
      return acc;
    }, { deposit: 0, withdraw: 0, income: 0, investment: 0 });
  }, [transactions]);
  
  const purchasedPlansCount = user?.investments?.length || 0;

  const isLoading = isLoadingUser || isLoadingWallet || isLoadingTransactions || isLoadingPlans;

  const handleEditStatClick = (title: string, value: number, field: string) => {
    setEditingStatField({ title, value, field });
    setNewStatValue(String(value));
    setIsStatEditDialogOpen(true);
  };
  
  const handleSaveStatChanges = async () => {
    if (!editingStatField || !firestore || !userId || !userDocRef) return;

    const numericNewValue = parseFloat(newStatValue);
    if (isNaN(numericNewValue)) {
      toast({ variant: 'destructive', title: 'Invalid value', description: 'Please enter a valid number.' });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      if (editingStatField.field === 'balance' && walletDocRef) {
        batch.update(walletDocRef, { balance: numericNewValue });
      } else if (['referralCount', 'referralIncome'].includes(editingStatField.field)) {
          batch.update(userDocRef, { [editingStatField.field]: numericNewValue });
      } else {
        const transactionCollectionRef = collection(firestore, 'users', userId, 'wallets', 'main', 'transactions');
        const diff = numericNewValue - editingStatField.value;
        
        await addDoc(transactionCollectionRef, {
            type: 'income',
            amount: diff,
            status: 'completed',
            date: serverTimestamp(),
            details: {
                reason: `Admin adjustment for ${editingStatField.title}`,
                adjustedBy: 'admin',
            },
            walletId: 'main'
        });
        
        if(walletDocRef && wallet) {
            batch.update(walletDocRef, { balance: wallet.balance + diff });
        }
      }

      await batch.commit();

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
    if (!editingTransaction || !firestore || !userId || !wallet) return;
    
    const txRef = doc(firestore, 'users', userId, 'wallets', 'main', 'transactions', editingTransaction.id);
    const walletRef = doc(firestore, 'users', userId, 'wallets', 'main');
    
    const newAmount = parseFloat(editedTxAmount);
    if(isNaN(newAmount)) {
      toast({ variant: 'destructive', title: 'Invalid amount' });
      return;
    }

    try {
        const originalTx = editingTransaction;
        let balanceAdjustment = 0;

        // Calculate balance adjustment based on status and type changes
        const wasCompleted = originalTx.status === 'completed';
        const isNowCompleted = editedTxStatus === 'completed';
        
        const oldEffect = (originalTx.type === 'deposit' || originalTx.type === 'income' || originalTx.type === 'referral_income') ? originalTx.amount : -originalTx.amount;
        const newEffect = (editedTxType === 'deposit' || editedTxType === 'income' || editedTxType === 'referral_income') ? newAmount : -newAmount;

        if (wasCompleted && !isNowCompleted) { // From completed to something else
             if (originalTx.type === 'deposit' || originalTx.type === 'income' || originalTx.type === 'referral_income') balanceAdjustment -= originalTx.amount;
            else if (originalTx.type === 'withdrawal' || originalTx.type === 'investment') balanceAdjustment += originalTx.amount;
        } else if (!wasCompleted && isNowCompleted) { // From something else to completed
            if (editedTxType === 'deposit' || editedTxType === 'income' || editedTxType === 'referral_income') balanceAdjustment += newAmount;
            else if (editedTxType === 'withdrawal' || editedTxType === 'investment') balanceAdjustment -= newAmount;
        } else if (wasCompleted && isNowCompleted) { // Both completed, but amount or type might have changed
            balanceAdjustment = newEffect - oldEffect;
        }


        const batch = writeBatch(firestore);
        
        batch.update(txRef, {
            amount: newAmount,
            type: editedTxType,
            status: editedTxStatus,
        });

        if (balanceAdjustment !== 0) {
            batch.update(walletRef, { balance: wallet.balance + balanceAdjustment });
        }

        await batch.commit();

        toast({ title: 'Transaction updated successfully!' });
        setIsTxEditDialogOpen(false);
        setEditingTransaction(null);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error updating transaction', description: e.message });
    }
  };

  const handleDeleteTx = async (tx: Transaction) => {
    if (!firestore || !userId || !wallet) return;

    try {
        const batch = writeBatch(firestore);
        const txRef = doc(firestore, 'users', userId, 'wallets', 'main', 'transactions', tx.id);
        const walletRef = doc(firestore, 'users', userId, 'wallets', 'main');

        // Adjust wallet balance
        let balanceAdjustment = 0;
        if(tx.status === 'completed') {
            if (tx.type === 'deposit' || tx.type === 'income' || tx.type === 'referral_income') {
                balanceAdjustment = -tx.amount;
            } else if (tx.type === 'withdrawal' || tx.type === 'investment') {
                balanceAdjustment = tx.amount;
            }
        }
        
        if (balanceAdjustment !== 0) {
            batch.update(walletRef, { balance: wallet.balance + balanceAdjustment });
        }

        batch.delete(txRef);
        await batch.commit();

        toast({ title: 'Transaction deleted' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error deleting transaction', description: e.message });
    }
  };

  const handleRevokeDeposit = async (tx: Transaction) => {
    if (!firestore || !userId || !wallet || tx.type !== 'deposit' || tx.status !== 'completed') {
      toast({ variant: 'destructive', title: 'Invalid Action', description: 'This action is only for completed deposits.' });
      return;
    }
  
    const batch = writeBatch(firestore);
    const walletRef = doc(firestore, 'users', userId, 'wallets', 'main');
    const originalTxRef = doc(firestore, 'users', userId, 'wallets', 'main', 'transactions', tx.id);
  
    try {
      // 1. Deduct amount from user's wallet
      const newBalance = wallet.balance - tx.amount;
      batch.update(walletRef, { balance: newBalance });
  
      // 2. Mark original transaction as 'revoked'
      batch.update(originalTxRef, { status: 'revoked' });
  
      // 3. Create a new transaction to record the revocation
      const revocationTxRef = doc(collection(firestore, 'users', userId, 'wallets', 'main', 'transactions'));
      batch.set(revocationTxRef, {
        type: 'withdrawal',
        amount: tx.amount,
        status: 'completed',
        date: serverTimestamp(),
        details: {
          reason: `Revocation of deposit TID: ${tx.details?.tid || tx.id}`,
          revokedBy: 'admin',
        },
        walletId: 'main'
      });
  
      await batch.commit();
  
      toast({
        title: 'Deposit Revoked',
        description: `Successfully revoked the deposit of ${tx.amount} PKR. The user's balance has been updated.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error Revoking Deposit', description: e.message });
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
          title="Wallet Balance"
          value={`${(wallet?.balance || 0).toLocaleString()} PKR`}
          description="Available funds"
          Icon={DollarSign}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Wallet Balance', wallet?.balance || 0, 'balance')}
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`${transactionTotals.investment.toLocaleString()} PKR`}
          description={`${purchasedPlansCount} active plans`}
          Icon={TrendingUp}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Total Invested', transactionTotals.investment, 'investment')}
        />
        <DashboardStatsCard
          title="Total Income"
          value={`${transactionTotals.income.toLocaleString()} PKR`}
          description="From investments"
          Icon={PiggyBank}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Total Income', transactionTotals.income, 'income')}
        />
         <DashboardStatsCard
          title="Total Deposit"
          value={`${transactionTotals.deposit.toLocaleString()} PKR`}
          description="Funds added"
          Icon={ArrowDownToLine}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Total Deposit', transactionTotals.deposit, 'deposit')}
        />
        <DashboardStatsCard
          title="Total Withdraw"
          value={`${transactionTotals.withdraw.toLocaleString()} PKR`}
          description="Funds taken out"
          Icon={ArrowUpFromLine}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Total Withdraw', transactionTotals.withdraw, 'withdraw')}
        />
        <DashboardStatsCard
          title="Total Referrals"
          value={(user.referralCount || 0).toString()}
          description="Friends invited"
          Icon={Users}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Total Referrals', user.referralCount || 0, 'referralCount')}
        />
        <DashboardStatsCard
          title="Referral Income"
          value={`${(user.referralIncome || 0).toLocaleString()} PKR`}
          description="From commissions"
          Icon={GitBranch}
          chartData={[]} chartKey=''
          onEdit={() => handleEditStatClick('Referral Income', user.referralIncome || 0, 'referralIncome')}
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
                                          This will deduct {tx.amount} PKR from the user's balance and create a "revoked" transaction record. This action cannot be undone.
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

    
    