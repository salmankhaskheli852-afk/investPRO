
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { investmentPlans } from '@/lib/data';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

const mockWalletData = [
  { name: 'Jan', balance: 1000 },
  { name: 'Feb', balance: 1200 },
  { name: 'Mar', balance: 900 },
  { name: 'Apr', balance: 1500 },
  { name: 'May', balance: 1400 },
  { name: 'Jun', balance: 1800 },
];

const mockInvestmentData = [
  { name: 'Jan', investment: 500 },
  { name: 'Feb', investment: 600 },
  { name: 'Mar', investment: 800 },
  { name: 'Apr', investment: 700 },
  { name: 'May', investment: 900 },
  { name: 'Jun', investment: 1100 },
];


export default function UserDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Mock user data for demonstration until Firestore is connected
  const mockUser = {
      name: user?.displayName || 'User',
      walletBalance: 1250.75,
      investments: ['plan-1'],
  };

  const activePlans = mockUser.investments.map(planId => investmentPlans.find(p => p.id === planId)).filter(Boolean);
  const totalInvestment = activePlans.reduce((sum, plan) => sum + (plan?.price || 0), 0);
  
  const [walletBalance, setWalletBalance] = React.useState(mockUser.walletBalance);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  React.useEffect(() => {
    const dailyGains = activePlans.reduce((total, plan) => total + (plan?.dailyIncome || 0), 0);
    if (dailyGains > 0) {
      const incomeInterval = setInterval(() => {
        setWalletBalance(prevBalance => prevBalance + dailyGains);
      }, 24 * 60 * 60 * 1000); // Simulate every 24 hours
      return () => clearInterval(incomeInterval);
    }
  }, [activePlans]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Welcome back, {mockUser.name.split(' ')[0]}!</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`${walletBalance.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 })}`}
          description="Available funds for investment or withdrawal"
          Icon={DollarSign}
          chartData={mockWalletData}
          chartKey="balance"
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`${totalInvestment.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 })}`}
          description={`${activePlans.length} active plans`}
          Icon={TrendingUp}
          chartData={mockInvestmentData}
          chartKey="investment"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Active Investments</CardTitle>
          <CardDescription>Here's an overview of your current investment portfolio.</CardDescription>
        </CardHeader>
        <CardContent>
          {activePlans.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {activePlans.map(plan => {
                if (!plan) return null;
                return (
                  <InvestmentPlanCard 
                    key={plan.id} 
                    plan={plan} 
                    isPurchased={true}
                    userWalletBalance={walletBalance}
                    showPurchaseButton={false}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>You have no active investments yet.</p>
              <p>Explore our plans to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
