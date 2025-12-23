
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { User, Transaction, AdminWallet } from '@/lib/data';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function HistoryRow({ tx, user }: { tx: Transaction; user: User | undefined }) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'revoked': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
          </div>
        </div>
      </TableCell>
      <TableCell className="font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
      <TableCell>
        {tx.type === 'deposit' ? (
          <div>
            <div className="font-medium">{details.senderName}</div>
            <div className="text-sm text-muted-foreground">{details.senderAccount}</div>
            <div className="text-xs text-muted-foreground">TID: {details.tid}</div>
          </div>
        ) : (
           <div>
            <div className="font-medium">{details.receiverName}</div>
            <div className="text-sm text-muted-foreground">{details.receiverAccount}</div>
            <div className="text-xs capitalize">{details.method}</div>
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getStatusBadgeClass(tx.status)}>{tx.status}</Badge>
      </TableCell>
      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}</TableCell>
    </TableRow>
  );
}


function HistoryTable({
  transactions,
  isLoading,
  searchQuery,
  onSearchChange,
  searchPlaceholder
}: {
  transactions: (Transaction & { user?: User })[] | null;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder: string;
}) {

  const filteredHistory = React.useMemo(() => {
    if (!transactions) return [];
    if (!searchQuery) return transactions;
    return transactions.filter(tx =>
        tx.details?.tid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.details?.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.details?.senderAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.details?.receiverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.details?.receiverAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  return (
    <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500 mt-4">
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>History</CardTitle>
              <CardDescription>A log of all processed transactions.</CardDescription>
            </div>
            <div className="w-full max-w-sm">
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
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
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : filteredHistory && filteredHistory.length > 0 ? (
                filteredHistory.map((tx) => (
                  <HistoryRow key={tx.id} tx={tx} user={tx.user} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


export default function AdminHistoryPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const [depositSearchQuery, setDepositSearchQuery] = React.useState('');
  const [withdrawalSearchQuery, setWithdrawalSearchQuery] = React.useState('');

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const depositHistoryQuery = useMemoFirebase(
    () => (firestore && adminUser ? query(collection(firestore, 'transactions'), where('type', '==', 'deposit'), where('status', 'in', ['completed', 'failed', 'revoked']), orderBy('date', 'desc')) : null),
    [firestore, adminUser]
  );
  const { data: depositHistory, isLoading: isLoadingDepositHistory } = useCollection<Transaction>(depositHistoryQuery);
  
  const withdrawalHistoryQuery = useMemoFirebase(
    () => (firestore && adminUser ? query(collection(firestore, 'transactions'), where('type', '==', 'withdrawal'), where('status', 'in', ['completed', 'failed']), orderBy('date', 'desc')) : null),
    [firestore, adminUser]
  );
  const { data: withdrawalHistory, isLoading: isLoadingWithdrawalHistory } = useCollection<Transaction>(withdrawalHistoryQuery);

  const enrichedDepositHistory = React.useMemo(() => {
    if (!depositHistory || !users) return null;
    return depositHistory.map(tx => ({
      ...tx,
      user: users.find(u => u.id === tx.details?.userId)
    }));
  }, [depositHistory, users]);
  
  const enrichedWithdrawalHistory = React.useMemo(() => {
    if (!withdrawalHistory || !users) return null;
    return withdrawalHistory.map(tx => ({
      ...tx,
      user: users.find(u => u.id === tx.details?.userId)
    }));
  }, [withdrawalHistory, users]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Transaction History</h1>
        <p className="text-muted-foreground">View all completed, failed, and revoked transactions.</p>
      </div>
      
      <Tabs defaultValue="deposits">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposits">Deposit History</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits">
          <HistoryTable
            transactions={enrichedDepositHistory}
            isLoading={isLoadingDepositHistory || isLoadingUsers}
            searchQuery={depositSearchQuery}
            onSearchChange={setDepositSearchQuery}
            searchPlaceholder="Search deposits by user, TID, etc..."
          />
        </TabsContent>

        <TabsContent value="withdrawals">
           <HistoryTable
            transactions={enrichedWithdrawalHistory}
            isLoading={isLoadingWithdrawalHistory || isLoadingUsers}
            searchQuery={withdrawalSearchQuery}
            onSearchChange={setWithdrawalSearchQuery}
            searchPlaceholder="Search withdrawals by user, account, etc..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
