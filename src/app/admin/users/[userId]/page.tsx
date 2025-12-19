
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
import { ArrowLeft, DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Edit } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { User, Transaction, Wallet, InvestmentPlan } from '@/lib/data';
import { collection, doc, query, orderBy, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<{ title: string; value: number; field: string } | null>(null);
  const [newValue, setNewValue] = React.useState('');

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

  const handleEditClick = (title: string, value: number, field: string) => {
    setEditingField({ title, value, field });
    setNewValue(String(value));
    setIsEditDialogOpen(true);
  };
  
  const handleSaveChanges = async () => {
    if (!editingField || !firestore || !userId) return;

    const numericNewValue = parseFloat(newValue);
    if (isNaN(numericNewValue)) {
      toast({ variant: 'destructive', title: 'Invalid value', description: 'Please enter a valid number.' });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      if (editingField.field === 'balance' && walletDocRef) {
        batch.update(walletDocRef, { balance: numericNewValue });
      } else {
        // For other fields, create a manual adjustment transaction
        const transactionCollectionRef = collection(firestore, 'users', userId, 'wallets', 'main', 'transactions');
        const diff = numericNewValue - editingField.value;
        
        await addDoc(transactionCollectionRef, {
            type: 'income', // Use 'income' for adjustments, or a new 'adjustment' type
            amount: diff,
            status: 'completed',
            date: serverTimestamp(),
            details: {
                reason: `Admin adjustment for ${editingField.title}`,
                adjustedBy: 'admin',
            },
            walletId: 'main'
        });
        
        // Also update wallet balance
        if(walletDocRef && wallet) {
            batch.update(walletDocRef, { balance: wallet.balance + diff });
        }
      }

      await batch.commit();

      toast({ title: 'Success', description: `${editingField.title} has been updated.` });
      setIsEditDialogOpen(false);
      setEditingField(null);

    } catch (e: any) {
       toast({ variant: 'destructive', title: 'Error updating value', description: e.message });
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
      default:
        return '';
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`${(wallet?.balance || 0).toLocaleString()} PKR`}
          description="Available funds"
          Icon={DollarSign}
          chartData={[]} chartKey=''
          onEdit={() => handleEditClick('Wallet Balance', wallet?.balance || 0, 'balance')}
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`${transactionTotals.investment.toLocaleString()} PKR`}
          description={`${purchasedPlansCount} active plans`}
          Icon={TrendingUp}
          chartData={[]} chartKey=''
          onEdit={() => handleEditClick('Total Invested', transactionTotals.investment, 'investment')}
        />
        <DashboardStatsCard
          title="Total Income"
          value={`${transactionTotals.income.toLocaleString()} PKR`}
          description="From investments"
          Icon={PiggyBank}
          chartData={[]} chartKey=''
          onEdit={() => handleEditClick('Total Income', transactionTotals.income, 'income')}
        />
      </div>
       <div className="grid gap-4 md:grid-cols-2">
         <DashboardStatsCard
          title="Total Deposit"
          value={`${transactionTotals.deposit.toLocaleString()} PKR`}
          description="Funds added"
          Icon={ArrowDownToLine}
          chartData={[]} chartKey=''
          onEdit={() => handleEditClick('Total Deposit', transactionTotals.deposit, 'deposit')}
        />
        <DashboardStatsCard
          title="Total Withdraw"
          value={`${transactionTotals.withdraw.toLocaleString()} PKR`}
          description="Funds taken out"
          Icon={ArrowUpFromLine}
          chartData={[]} chartKey=''
          onEdit={() => handleEditClick('Total Withdraw', transactionTotals.withdraw, 'withdraw')}
        />
      </div>


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
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : transactions && transactions.length > 0 ? (
                transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell>{tx.details?.planName || tx.details?.method || tx.details?.reason || 'N/A'}</TableCell>
                      <TableCell className='text-right'>{tx.amount.toLocaleString()} PKR</TableCell>
                      <TableCell>
                         <Badge
                            variant={tx.status === 'completed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}
                            className={getStatusBadge(tx.status)}
                        >
                            {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPpp') : 'N/A'}</TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No transaction history found for this user.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingField?.title}</DialogTitle>
            <DialogDescription>
              Enter the new value. This will be reflected in the user's account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-value">New Value (PKR)</Label>
            <Input
              id="new-value"
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Enter new ${editingField?.title.toLowerCase()}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
