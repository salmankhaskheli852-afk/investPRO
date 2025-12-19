
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
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { User, Transaction } from '@/lib/data';
import { collection, doc, query, where, collectionGroup } from 'firebase/firestore';
import { format } from 'date-fns';

interface AgentHistoryPageProps {
  params: { agentId: string };
}

export default function AgentHistoryPage({ params }: AgentHistoryPageProps) {
  const agentId = params.agentId;
  const firestore = useFirestore();

  const agentDocRef = useMemoFirebase(
      () => firestore ? doc(firestore, 'users', agentId) : null,
      [firestore, agentId]
  );
  const { data: agent, isLoading: isLoadingAgent } = useDoc<User>(agentDocRef);

  // Get users managed by this agent
  const managedUsersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), where('agentId', '==', agentId)) : null,
    [firestore, agentId]
  );
  const { data: managedUsers, isLoading: isLoadingUsers } = useCollection<User>(managedUsersQuery);

  // This is a simplified query. For a large number of users, this would be inefficient.
  // A better approach would be to denormalize the agentId onto the transaction itself.
  const withdrawalTransactionsQuery = useMemoFirebase(
      () => {
          if (!firestore || !managedUsers || managedUsers.length === 0) return null;
          const userIds = managedUsers.map(u => u.id);
          return query(
              collectionGroup(firestore, 'transactions'),
              where('type', '==', 'withdrawal'),
              where('details.userId', 'in', userIds)
          );
      },
      [firestore, managedUsers]
  );
  const { data: withdrawalTransactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(withdrawalTransactionsQuery);

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
  
  const isLoading = isLoadingAgent || isLoadingUsers || isLoadingTransactions;

  if (!isLoading && !agent) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline">Agent not found</h1>
        <Link href="/admin/agents">
            <Button variant="link">Go back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold font-headline">Withdrawal History for {agent?.name || '...'}</h1>
            <p className="text-muted-foreground">A record of all withdrawal transactions for users managed by this agent.</p>
        </div>
       </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : withdrawalTransactions && withdrawalTransactions.length > 0 ? (
                withdrawalTransactions.map((tx) => {
                  const user = managedUsers?.find(u => u.id === tx.details.userId);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user?.name}</div>
                            <div className="text-sm text-muted-foreground">{user?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{tx.amount.toLocaleString()} PKR</TableCell>
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No withdrawal history found for this agent's users.
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
