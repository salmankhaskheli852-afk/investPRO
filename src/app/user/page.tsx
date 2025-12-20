
'use client';

import React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, orderBy, query, Timestamp } from 'firebase/firestore';
import type { InvestmentPlan, User, Wallet, Transaction, UserInvestment } from '@/lib/data';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { DollarSign, TrendingUp, PiggyBank, GitBranch, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UserDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

  const walletRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid, 'wallets', 'main') : null),
    [firestore, user]
  );
  const { data: walletData, isLoading: isWalletLoading } = useDoc<Wallet>(walletRef);
  
  const transactionsQuery = useMemoFirebase(
    () => user && firestore 
      ? query(
          collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'),
          orderBy('date', 'desc')
        )
      : null,
    [user, firestore]
  );
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const plansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: allPlans } = useCollection<InvestmentPlan>(plansQuery);

  const transactionTotals = React.useMemo(() => {
    if (!transactions) return { deposit: 0, withdraw: 0, income: 0, referral_income: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit') acc.deposit += tx.amount;
        else if (tx.type === 'withdrawal') acc.withdraw += tx.amount;
        else if (tx.type === 'income') acc.income += tx.amount;
        else if (tx.type === 'referral_income') acc.referral_income += tx.amount;
      }
      return acc;
    }, { deposit: 0, withdraw: 0, income: 0, referral_income: 0 });
  }, [transactions]);


  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const activeInvestments = React.useMemo(() => {
    if (!userData?.investments || !allPlans) return [];
    
    // This is a simplified view. Real active status might depend on purchaseDate + incomePeriod.
    return userData.investments.map(investment => {
      return allPlans.find(plan => plan.id === investment.planId);
    }).filter((plan): plan is InvestmentPlan => !!plan);
  }, [userData, allPlans]);

  if (isUserLoading || isUserDocLoading || isWalletLoading || isLoadingTransactions) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user || !userData) {
      return null;
  }

  const dailyIncome = activeInvestments.reduce((total, plan) => {
    return total + (plan.price * (plan.dailyIncomePercentage / 100));
  }, 0);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userData?.name}!</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`PKR ${(walletData?.balance || 0).toLocaleString()}`}
          description="Available funds"
          Icon={DollarSign}
          chartData={[]} chartKey=''
        />
        <DashboardStatsCard
          title="Total Invested"
          value={`PKR ${activeInvestments.reduce((sum, p) => sum + p.price, 0).toLocaleString()}`}
          description={`${activeInvestments.length} active plans`}
          Icon={TrendingUp}
          chartData={[]} chartKey=''
        />
         <DashboardStatsCard
          title="Daily Income"
          value={`PKR ${dailyIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
          description="From investments"
          Icon={PiggyBank}
          chartData={[]} chartKey=''
        />
         <DashboardStatsCard
          title="Referral Income"
          value={`PKR ${(userData?.referralIncome || 0).toLocaleString()}`}
          description={`From ${userData.referralCount || 0} friends`}
          Icon={GitBranch}
          chartData={[]} chartKey=''
        />
         <DashboardStatsCard
          title="Total Deposit"
          value={`PKR ${transactionTotals.deposit.toLocaleString()}`}
          description="Funds added"
          Icon={ArrowDownToLine}
          chartData={[]} chartKey=''
        />
         <DashboardStatsCard
          title="Total Withdraw"
          value={`PKR ${transactionTotals.withdraw.toLocaleString()}`}
          description="Funds taken out"
          Icon={ArrowUpFromLine}
          chartData={[]} chartKey=''
        />
      </div>

       <Card>
        <CardHeader>
          <CardTitle>My Active Investments</CardTitle>
          <CardDescription>
            Here's an overview of your current investment portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {activeInvestments.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {activeInvestments.map((plan) => (
                <InvestmentPlanCard key={plan.id} plan={plan} isPurchased={true} showPurchaseButton={false} />
              ))}
            </div>
           ) : (
             <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You have no active investments yet.</p>
                <Button asChild>
                    <Link href="/user/investments">Explore our plans to get started!</Link>
                </Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
