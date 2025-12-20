
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { User, Transaction, InvestmentPlan } from '@/lib/data';
import { DollarSign, Users, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';


export default function AgentDashboardPage() {
  const { user: agentUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Get users managed by this agent
  const managedUsersQuery = useMemoFirebase(
    () => firestore && agentUser ? query(collection(firestore, 'users'), where('agentId', '==', agentUser.uid)) : null,
    [firestore, agentUser]
  );
  const { data: managedUsers, isLoading: isLoadingUsers } = useCollection<User>(managedUsersQuery);

  const investmentPlansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: investmentPlans } = useCollection<InvestmentPlan>(investmentPlansQuery);

  // Get transactions for managed users.
  const userActivitiesQuery = useMemoFirebase(
      () => {
          if (!firestore || !managedUsers) return null;
          const userIds = managedUsers.map(u => u.id);
          // IMPORTANT: Check if userIds is empty. An 'in' query with an empty array is invalid.
          if (userIds.length === 0) return null;
          return query(
              collection(firestore, 'transactions'),
              where('details.userId', 'in', userIds),
              orderBy('date', 'desc'),
              limit(5)
          );
      },
      [firestore, managedUsers]
  );
  const { data: userActivities, isLoading: isLoadingActivities } = useCollection<Transaction>(userActivitiesQuery);

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
  
  const isLoading = isUserLoading || isLoadingUsers || isLoadingActivities;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Agent Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatsCard
          title="My Users"
          value={isLoadingUsers ? '...' : (managedUsers?.length || 0).toString()}
          description="Total users under your management"
          Icon={Users}
          chartData={[]}
          chartKey=''
        />
        <DashboardStatsCard
          title="Total Commission"
          value={`PKR 0.00`}
          description="Your estimated earnings"
          Icon={DollarSign}
          chartData={[]}
          chartKey=''
        />
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent User Activity
          </CardTitle>
          <CardDescription>Latest transactions from users you manage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className='text-center h-24'>Loading activities...</TableCell>
                </TableRow>
              ) : userActivities && userActivities.length > 0 ? (
                userActivities.map((tx) => {
                    const user = managedUsers?.find(u => u.id === tx.details.userId);
                    return (
                    <TableRow key={tx.id}>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{user?.name}</span>
                        </div>
                        </TableCell>
                        <TableCell className="capitalize">{tx.type}</TableCell>
                        <TableCell>
                        <Badge
                            variant={tx.status === 'completed' ? 'default' : 'secondary'}
                            className={getStatusBadge(tx.status)}
                        >
                            {tx.status}
                        </Badge>
                        </TableCell>
                        <TableCell>{tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}</TableCell>
                        <TableCell className="text-right font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
                    </TableRow>
                    );
                })
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className='text-center h-24'>No recent activity found.</TableCell>
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
