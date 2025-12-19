
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { users, investmentPlans } from '@/lib/data';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';

export default function UserDashboardPage() {
  const user = users[0]; // Mock current user
  const activePlans = user.investments.map(planId => investmentPlans.find(p => p.id === planId)).filter(Boolean);
  const totalInvestment = activePlans.reduce((sum, plan) => sum + (plan?.price || 0), 0);
  
  // Mock daily income simulation
  const [walletBalance, setWalletBalance] = React.useState(user.walletBalance);

  React.useEffect(() => {
    const incomeInterval = setInterval(() => {
      const dailyGains = activePlans.reduce((total, plan) => total + (plan?.dailyIncome || 0), 0);
      if (dailyGains > 0) {
        setWalletBalance(prevBalance => prevBalance + dailyGains);
      }
    }, 24 * 60 * 60 * 1000); // Simulate every 24 hours

    return () => clearInterval(incomeInterval);
  }, [activePlans]);


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`${walletBalance.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 })}`}
          description="Available funds for investment or withdrawal"
          Icon={DollarSign}
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`${totalInvestment.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 })}`}
          description={`${activePlans.length} active plans`}
          Icon={TrendingUp}
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
