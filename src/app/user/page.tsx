
'use client';

import React from 'react';
import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where, getDocs, collectionGroup, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { InvestmentPlan, User, Wallet, Transaction, UserInvestment } from '@/lib/data';

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
    () => (firestore && user ? collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions') : null),
    [firestore, user]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const plansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: allPlans } = useCollection<InvestmentPlan>(plansQuery);


  const activePlans = React.useMemo(() => {
    if (!userData?.investments || !allPlans) return [];
    return userData.investments.map(userInv => {
        const planDetails = allPlans.find(plan => plan.id === userInv.planId);
        return planDetails ? { ...planDetails, userInvestment: userInv } : null;
    }).filter(Boolean) as (InvestmentPlan & { userInvestment: UserInvestment })[];
  }, [userData?.investments, allPlans]);

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

  // Client-side daily income simulation
  React.useEffect(() => {
    if (!firestore || !user || !walletData || activePlans.length === 0) return;
  
    const processDailyIncome = async () => {
      const batch = writeBatch(firestore);
      let totalIncomeToCredit = 0;
      let incomeProcessed = false;
  
      for (const activePlan of activePlans) {
        if (!activePlan.userInvestment?.purchaseDate) continue;
  
        const planPurchaseDate = activePlan.userInvestment.purchaseDate.toDate();
        const now = new Date();
  
        const lastIncomeKey = `lastIncome_${user.uid}_${activePlan.id}`;
        const lastIncomeDateStr = localStorage.getItem(lastIncomeKey);
        const lastIncomeDate = lastIncomeDateStr ? new Date(lastIncomeDateStr) : planPurchaseDate;
        
        const timeSinceLastIncome = now.getTime() - lastIncomeDate.getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
  
        // Check if 24 hours have passed since the last income was given
        if (timeSinceLastIncome >= twentyFourHours) {
          const planEndDate = new Date(planPurchaseDate.getTime() + activePlan.incomePeriod * twentyFourHours);
          
          // Check if the plan is still active
          if (now < planEndDate) {
            const dailyIncome = activePlan.price * (activePlan.dailyIncomePercentage / 100);
            totalIncomeToCredit += dailyIncome;
            incomeProcessed = true;
  
            // Update the last income date in local storage for this plan
            localStorage.setItem(lastIncomeKey, now.toISOString());
  
            // Create a transaction record for this income
            const txRef = doc(collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'));
            batch.set(txRef, {
              id: txRef.id,
              walletId: 'main',
              type: 'income',
              amount: dailyIncome,
              status: 'completed',
              date: serverTimestamp(),
              details: { 
                reason: `Daily profit from ${activePlan.name}`,
                planId: activePlan.id,
              }
            });
          }
        }
      }
  
      if (incomeProcessed && totalIncomeToCredit > 0) {
        try {
          const userWalletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
          const newBalance = walletData.balance + totalIncomeToCredit;
          batch.update(userWalletRef, { balance: newBalance });
  
          await batch.commit();
        } catch (e) {
          console.error("Failed to process daily income batch:", e);
        }
      }
    };
  
    // Run once on mount and then set an interval
    processDailyIncome();
    const intervalId = setInterval(processDailyIncome, 60 * 60 * 1000); // Check every hour
  
    return () => clearInterval(intervalId);
  }, [firestore, user, walletData, activePlans]);


  if (isUserLoading || isUserDocLoading || isWalletLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user || !userData) {
      // This case should be handled by the useEffect redirect, but it's a good fallback
      return null;
  }


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Welcome back, {userData?.name.split(' ')[0]}!</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardStatsCard
          title="Wallet Balance"
          value={`${(walletData?.balance || 0).toLocaleString('en-US', { style: 'currency', currency: 'PKR', minimumFractionDigits: 2 })}`}
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
                    userWalletBalance={walletData?.balance}
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
