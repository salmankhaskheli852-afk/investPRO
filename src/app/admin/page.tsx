
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { InvestmentPlan, User, Transaction } from '@/lib/data';
import { DollarSign, TrendingUp, Users as UsersIcon, UserCog, ArrowDownToLine, ArrowUpFromLine, GitBranch, PiggyBank } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';


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

  const allUsersQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, 'users') : null,
    [firestore, user]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(allUsersQuery);

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
  
  const allTransactionsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'transactions') : null),
    [firestore, user]
  );
  const { data: allTransactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(allTransactionsQuery);

  const depositsQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'pending')) : null,
    [firestore, user]
  );
  const { data: depositRequests, isLoading: isLoadingDeposits } = useCollection<Transaction>(depositsQuery);

  const withdrawalsQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'transactions'), where('type', '==', 'withdrawal'), where('status', '==', 'pending')) : null,
    [firestore, user]
  );
  const { data: withdrawalRequests, isLoading: isLoadingWithdrawals } = useCollection<Transaction>(withdrawalsQuery);

  const totalReferrals = React.useMemo(() => {
    if (!allUsers) return 0;
    return allUsers.filter(user => !!user.referrerId).length;
  }, [allUsers]);

  const financialTotals = React.useMemo(() => {
    if (!allTransactions || !user) return { deposit: 0, withdrawal: 0, income: 0 };
    
    // For admin, we show all transactions. If it were an agent, we'd filter here.
    const relevantTransactions = allTransactions;

    return relevantTransactions.reduce((acc, tx) => {
        if (tx.status === 'completed') {
            if (tx.type === 'deposit') acc.deposit += tx.amount;
            else if (tx.type === 'withdrawal') acc.withdrawal += tx.amount;
            else if (tx.type === 'income') acc.income += tx.amount;
        }
        return acc;
    }, { deposit: 0, withdrawal: 0, income: 0 });
  }, [allTransactions, user]);

  const isLoading = isLoadingUsers || isLoadingAgents || isLoadingPlans || isLoadingTransactions || isLoadingDeposits || isLoadingWithdrawals;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatsCard
          title="Total Deposit"
          value={`${financialTotals.deposit.toLocaleString()} PKR`}
          description="Total amount deposited by users"
          Icon={ArrowDownToLine}
          chartData={mockRevenueData}
          chartKey="revenue"
        />
        <DashboardStatsCard
          title="Total Withdrawals"
          value={`${financialTotals.withdrawal.toLocaleString()} PKR`}
          description="Total amount withdrawn by users"
          Icon={ArrowUpFromLine}
          chartData={[]}
          chartKey="value"
        />
         <DashboardStatsCard
          title="Total Income"
          value={`${financialTotals.income.toLocaleString()} PKR`}
          description="Total income generated"
          Icon={PiggyBank}
          chartData={[]}
          chartKey="value"
        />
        <DashboardStatsCard
          title="Total Users"
          value={isLoadingUsers ? '...' : (allUsers?.length || 0).toString()}
          description="Number of registered users"
          Icon={UsersIcon}
          chartData={mockUsersData}
          chartKey="users"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
         <DashboardStatsCard
          title="Pending Deposits"
          value={isLoadingDeposits ? '...' : (depositRequests?.length || 0).toString()}
          description="Pending deposit approvals"
          Icon={ArrowDownToLine}
          chartData={[]}
          chartKey="value"
        />
        <DashboardStatsCard
          title="Pending Withdrawals"
          value={isLoadingWithdrawals ? '...' : (withdrawalRequests?.length || 0).toString()}
          description="Pending withdrawal approvals"
          Icon={ArrowUpFromLine}
          chartData={[]}
          chartKey="value"
        />
      </div>

    </div>
  );
}
