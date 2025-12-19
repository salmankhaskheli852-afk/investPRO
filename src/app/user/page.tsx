import Image from 'next/image';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { users, investmentPlans } from '@/lib/data';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function UserDashboardPage() {
  const user = users[0]; // Mock current user
  const activePlans = user.investments.map(planId => investmentPlans.find(p => p.id === planId)).filter(Boolean);
  const totalInvestment = activePlans.reduce((sum, plan) => sum + (plan?.price || 0), 0);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`${user.walletBalance.toLocaleString()} PKR`}
          description="Available funds for investment or withdrawal"
          Icon={DollarSign}
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`${totalInvestment.toLocaleString()} PKR`}
          description={`${activePlans.length} active plans`}
          Icon={TrendingUp}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Active Investments</CardTitle>
          <CardDescription>Here's an overview of your current investment portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {activePlans.length > 0 ? (
            activePlans.map(plan => {
              if (!plan) return null;
              const progress = 63; // Mock progress
              return (
                <div key={plan.id} className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <Image
                      src={plan.imageUrl}
                      alt={plan.name}
                      width={128}
                      height={96}
                      className="rounded-md object-cover aspect-[4/3] w-full sm:w-32"
                      data-ai-hint={plan.imageHint}
                    />
                    <div className="flex-1 w-full text-sm">
                        <div className="flex justify-between"><span>Product price</span> <span className="font-medium">{plan.price.toLocaleString()} Rs</span></div>
                        <div className="flex justify-between"><span>Daily income</span> <span className="font-medium">{plan.dailyIncome.toLocaleString()} Rs</span></div>
                        <div className="flex justify-between"><span>Income period</span> <span className="font-medium">{plan.incomePeriod}</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              );
            })
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
