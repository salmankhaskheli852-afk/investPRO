
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { InvestmentPlan, User } from '@/lib/data';
import { DollarSign, TrendingUp, Users as UsersIcon, UserCog } from 'lucide-react';
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
  

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatsCard
          title="Total Revenue"
          value={`0 PKR`}
          description="Total amount invested by users"
          Icon={DollarSign}
          chartData={mockRevenueData}
          chartKey="revenue"
        />
        <DashboardStatsCard
          title="Total Users"
          value={isLoadingUsers ? '...' : (allUsers?.length || 0).toString()}
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

    </div>
  );
}
