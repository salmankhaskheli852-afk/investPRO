import Image from 'next/image';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { users, investmentPlans } from '@/lib/data';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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
              const progress = Math.min(((plan.totalIncome - plan.price) / 2 / (plan.totalIncome - plan.price)) * 100, 100); // Mock progress
              return (
                <div key={plan.id} className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border p-4">
                  <Image
                    src={plan.imageUrl}
                    alt={plan.name}
                    width={100}
                    height={75}
                    className="rounded-md object-cover w-full sm:w-auto"
                    data-ai-hint={plan.imageHint}
                  />
                  <div className="flex-1 w-full">
                    <div className='flex justify-between items-start'>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.price} PKR Investment</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Earned: ~
                          {(plan.totalIncome - plan.price) / 2} PKR
                        </span>
                        <span>Total Profit: {plan.totalIncome - plan.price} PKR</span>
                      </div>
                    </div>
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
