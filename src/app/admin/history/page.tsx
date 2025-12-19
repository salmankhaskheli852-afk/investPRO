
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { User, Transaction } from '@/lib/data';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function TransactionRow({ tx, user }: { tx: Transaction, user: User | undefined }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-700';
      case 'pending': return 'bg-amber-500/20 text-amber-700';
      case 'failed': return 'bg-red-500/20 text-red-700';
      case 'revoked': return 'bg-gray-500/20 text-gray-700';
      default: return '';
    }
  };

  const getTypeText = () => {
    if (tx.type === 'investment') return `Investment: ${tx.details?.planName || 'Plan'}`;
    return tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
  };

  return (
    <TableRow>
        <TableCell>
            {user ? (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                </div>
            ) : (
                <div className="text-muted-foreground">System</div>
            )}
        </TableCell>
        <TableCell>{getTypeText()}</TableCell>
        <TableCell>{tx.details?.reason || tx.details?.method || 'N/A'}</TableCell>
        <TableCell className="font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
        <TableCell>
            <Badge variant="outline" className={getStatusBadge(tx.status)}>
            {tx.status}
            </Badge>
        </TableCell>
        <TableCell>{tx.date ? format(tx.date.toDate(), 'PPpp') : 'N/A'}</TableCell>
    </TableRow>
  );
}

function TransactionsTable({ status }: { status: 'completed' | 'pending' | 'failed' }) {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'users') : null,
        [firestore]
    );
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    
    const transactionsQuery = useMemoFirebase(
        () => {
            if (!firestore) return null;
            // Calculate the date 7 days ago from now.
            const sevenDaysAgo = subDays(new Date(), 7);
            const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

            return query(
                collection(firestore, 'transactions'), 
                where('status', '==', status), 
                where('date', '>=', sevenDaysAgoTimestamp), // Only get transactions from the last 7 days.
                orderBy('date', 'desc')
            );
        },
        [firestore, status]
    );
    const { data: transactions, isLoading: isLoadingTxs } = useCollection<Transaction>(transactionsQuery);

    const isLoading = isLoadingUsers || isLoadingTxs;

    const findUserForTx = (tx: Transaction) => {
        if (!tx.details?.userId) return undefined;
        return users?.find(u => u.id === tx.details.userId);
    };

    return (
        <Card>
            <CardContent className="pt-6">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        Loading transactions...
                    </TableCell>
                    </TableRow>
                ) : transactions && transactions.length > 0 ? (
                    transactions.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} user={findUserForTx(tx)} />
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No {status} transactions found in the last 7 days.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    );
}

export default function AdminHistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Transaction History</h1>
        <p className="text-muted-foreground">A record of all financial activities across the platform from the last 7 days.</p>
      </div>

      <Tabs defaultValue="completed" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
        <TabsContent value="completed">
            <TransactionsTable status="completed" />
        </TabsContent>
        <TabsContent value="pending">
            <TransactionsTable status="pending" />
        </TabsContent>
        <TabsContent value="failed">
            <TransactionsTable status="failed" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
