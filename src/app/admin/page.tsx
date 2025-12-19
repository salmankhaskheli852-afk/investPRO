
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { InvestmentPlan, User, Transaction } from '@/lib/data';
import { DollarSign, TrendingUp, Users as UsersIcon, UserCog, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, collectionGroup, query, orderBy, limit, where } from 'firebase/firestore';
import { format } from 'date-fns';

const mockRevenueData = [
  { name: 'Jan', revenue: 20000 },
  { name: 'Feb', revenue: 22000 },
  { name: 'Mar', revenue: 19000 },
  { name: 'Apr', revenue: 25000 },
  { name: 'May', revenue: 24000 },
  { name: 'Jun', revenue: 28000 },
];

const mockUsersData = [
  { name: 'Jan', users: 10 },
  { name: 'Feb', users: 12 },
  { name: 'Mar', users: 15 },
  { name: 'Apr', users: 14 },
  { name: 'May', users: 18 },
  { name: 'Jun', users: 22 },
];


export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const usersQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, 'users') : null,
    [firestore, user]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const agentsQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'users'), where('role', '==', 'agent')) : null,
    [firestore, user]
  );
  const { data: agents, isLoading: isLoadingAgents } = useCollection<User>(agentsQuery);

  const plansQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, 'investment_plans') : null,
    [firestore, user]
  );
  const { data: investmentPlans, isLoading: isLoadingPlans } = useCollection<InvestmentPlan>(plansQuery);
  
  const transactionsQuery = useMemoFirebase(
    () => firestore && user
      ? query(
          collectionGroup(firestore, 'transactions'),
          orderBy('date', 'desc'),
          limit(5)
        ) 
      : null,
    [firestore, user]
  );
  const { data: recentTransactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);
  
  // This is a simplified calculation. A real-world scenario would use aggregated data.
  const totalInvestment = React.useMemo(() => {
    if (!users || !investmentPlans) return 0;
    return users.reduce((acc, user) => {
        const userInvestments = user.investments?.reduce((sum, planId) => {
            const plan = investmentPlans.find(p => p.id === planId);
            return sum + (plan?.price || 0);
        }, 0) || 0;
        return acc + userInvestments;
    }, 0);
  }, [users, investmentPlans]);


  const getTransactionUser = (tx: Transaction) => {
    if (!users || !tx.details?.userId) return null;
    return users.find(u => u.id === tx.details.userId);
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


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatsCard
          title="Total Revenue"
          value={`${totalInvestment.toLocaleString()} PKR`}
          description="Total amount invested by users"
          Icon={DollarSign}
          chartData={mockRevenueData}
          chartKey="revenue"
        />
        <DashboardStatsCard
          title="Total Users"
          value={isLoadingUsers ? '...' : (users?.length || 0).toString()}
          description="Number of registered users"
          Icon={UsersIcon}
          chartData={mockUsersData}
          chartKey="users"
        />
        <DashboardStatsCard
          title="Total Agents"
          value={isLoadingAgents ? '...' : (agents?.length || 0).toString()}
          description="Number of registered agents"
          Icon={UserCog}
          chartData={[{ a:1}, {a:2}]}
          chartKey="a"
        />
        <DashboardStatsCard
          title="Investment Plans"
          value={isLoadingPlans ? '...' : (investmentPlans?.length || 0).toString()}
          description="Number of available plans"
          Icon={TrendingUp}
          chartData={[{ a:1}, {a:2}]}
          chartKey="a"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>An overview of the latest financial activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTransactions && (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              )}
              {recentTransactions?.map((tx) => {
                const user = getTransactionUser(tx);
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                          <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user?.name}</div>
                          <div className="text-xs text-muted-foreground">{user?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{tx.type}</TableCell>
                    <TableCell className="text-right font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.status === 'completed' ? 'default' : 'secondary'}
                        className={getStatusBadge(tx.status)}
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.date ? format(tx.date.toDate(), 'PPp') : 'N/A'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
