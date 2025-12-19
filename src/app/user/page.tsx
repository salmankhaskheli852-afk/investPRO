'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import type { InvestmentPlan, User, Wallet, Transaction } from '@/lib/data';

const mockWalletData = [
  { name: 'Jan', balance: 1000 },
  { name: 'Feb', balance: 1200 },
  { name: 'Mar', balance: 900 },
  { name: 'Apr', balance: 1500 },
  { name: 'May', balance: 1400 },
  { name: 'Jun', balance: 1800 },
];

const mockInvestmentData = [
  { name: 'Jan', value: 500 },
  { name: 'Feb', value: 600 },
  { name: 'Mar', value: 800 },
  { name: 'Apr', value: 700 },
  { name: 'May', value: 900 },
  { name: 'Jun', value: 1100 },
];
const mockIncomeData = [
    { name: 'Jan', value: 150 },
    { name: 'Feb', value: 180 },
    { name: 'Mar', value: 220 },
    { name: 'Apr', value: 200 },
    { name: 'May', value: 250 },
    { name: 'Jun', value: 280 },
];


export default function UserDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  // Fetch user profile
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

  // Fetch user wallet
  const walletRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid, 'wallets', 'main') : null),
    [firestore, user]
  );
  const { data: walletData, isLoading: isWalletLoading } = useDoc<Wallet>(walletRef);
  const [walletBalance, setWalletBalance] = React.useState(0);

  // Fetch user transactions
  const transactionsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions') : null),
    [firestore, user]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  // Fetch all investment plans to filter against user's plans
  const plansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: allPlans } = useCollection<InvestmentPlan>(plansQuery);


  const activePlans = React.useMemo(() => {
    if (!userData?.investments || !allPlans) return [];
    return allPlans.filter(plan => userData.investments.includes(plan.id));
  }, [userData, allPlans]);

  const totalInvestment = React.useMemo(() => {
    return activePlans.reduce((sum, plan) => sum + (plan?.price || 0), 0);
  }, [activePlans]);

  const transactionTotals = React.useMemo(() => {
    if (!transactions) return { deposit: 0, withdraw: 0, income: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit') acc.deposit += tx.amount;
        else if (tx.type === 'withdrawal') acc.withdraw += tx.amount;
        else if (tx.type === 'income') acc.income += tx.amount;
      }
      return acc;
    }, { deposit: 0, withdraw: 0, income: 0 });
  }, [transactions]);


  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

   React.useEffect(() => {
    if (walletData) {
      setWalletBalance(walletData.balance);
    }
  }, [walletData]);

  // Daily income simulation
  React.useEffect(() => {
    const dailyGains = activePlans.reduce((total, plan) => total + (plan?.dailyIncome || 0), 0);
    if (dailyGains > 0) {
      const incomeInterval = setInterval(() => {
        // In a real app, this would be a server-side function.
        // For simulation, we'll just update the local state.
        setWalletBalance(prevBalance => prevBalance + dailyGains);
      }, 24 * 60 * 60 * 1000); 
      return () => clearInterval(incomeInterval);
    }
  }, [activePlans]);

  if (isUserLoading || isUserDocLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!userData) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <p>Could not load user profile. Please try again later.</p>
        </div>
      )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Welcome back, {userData?.name.split(' ')[0]}!</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`${walletBalance.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 })}`}
          description="Available funds"
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
          chartKey="value"
        />
        <DashboardStatsCard
          title="Total Income"
          value={`${transactionTotals.income.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 })}`}
          description="From investments"
          Icon={PiggyBank}
          chartData={mockIncomeData}
          chartKey="value"
        />
      </div>
       <div className="grid gap-4 md:grid-cols-2">
         <DashboardStatsCard
          title="Total Deposit"
          value={`${transactionTotals.deposit.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 })}`}
          description="Funds added"
          Icon={ArrowDownToLine}
          chartData={mockInvestmentData}
          chartKey="value"
        />
        <DashboardStatsCard
          title="Total Withdraw"
          value={`${transactionTotals.withdraw.toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 })}`}
          description="Funds taken out"
          Icon={ArrowUpFromLine}
          chartData={mockIncomeData}
          chartKey="value"
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
