
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Transaction } from '@/lib/data';
import { collection, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';

function TransactionRow({ tx }: { tx: Transaction }) {
  const getStatusBadge = () => {
    switch (tx.status) {
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
  
  const getTypeText = () => {
      let typeText = tx.type.replace('_', ' ');
      typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
      
      if (tx.type === 'investment' && tx.details?.planName) {
          return `${typeText}: ${tx.details.planName}`;
      }
      if(tx.type === 'referral_income' && tx.details?.reason) {
          return tx.details.reason;
      }
      return typeText;
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{getTypeText()}</div>
        {tx.details?.tid && <div className="text-xs text-muted-foreground">TID: {tx.details.tid}</div>}
      </TableCell>
      <TableCell className="text-right font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
      <TableCell>
        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className={getStatusBadge()}>
          {tx.status}
        </Badge>
      </TableCell>
      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPpp') : 'Date not available'}</TableCell>
    </TableRow>
  );
}


export default function UserHistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(
    () => user && firestore 
      ? query(
          collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'),
          orderBy('date', 'desc')
        )
      : null,
    [user, firestore]
  );

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Transaction History</h1>
        <p className="text-muted-foreground">A record of all your financial activities.</p>
      </div>

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading history...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && transactions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
              {transactions?.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
