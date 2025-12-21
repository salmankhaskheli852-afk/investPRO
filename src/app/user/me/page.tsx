
'use client';

import React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, orderBy, query, Timestamp } from 'firebase/firestore';
import type { InvestmentPlan, User, Wallet, Transaction, UserInvestment } from '@/lib/data';
import { DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, LogOut, Wallet as WalletIcon, GitBranch, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';

export default function UserDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

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

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} has been copied to your clipboard.`,
    });
  };

  const transactionTotals = React.useMemo(() => {
    if (!transactions) return { deposit: 0, withdraw: 0, referral_income: 0, income: 0, investment: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit') acc.deposit += tx.amount;
        else if (tx.type === 'withdrawal') acc.withdraw += tx.amount;
        else if (tx.type === 'referral_income') acc.referral_income += tx.amount;
        else if (tx.type === 'income') acc.income += tx.amount;
        else if (tx.type === 'investment') acc.investment += tx.amount;
      }
      return acc;
    }, { deposit: 0, withdraw: 0, referral_income: 0, income: 0, investment: 0 });
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

  const dailyIncome = React.useMemo(() => {
    return activeInvestments.reduce((total, plan) => {
        return total + (plan.price * (plan.dailyIncomePercentage / 100));
    }, 0);
  }, [activeInvestments]);

  // Sample data for the background chart
  const chartData = [
    { value: 1000 },
    { value: 1200 },
    { value: 800 },
    { value: 1500 },
    { value: 1400 },
    { value: 2000 },
    { value: 1800 },
  ];

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
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userData?.name || userData?.email}!</p>
        {userData.id && (
            <div className="flex items-center text-sm mt-1">
                <span className="text-muted-foreground">ID: {userData.id}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(String(userData.id), 'User ID')}>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        )}
      </div>
      
      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
                <div className="flex flex-col items-center text-center space-y-2 mb-6">
                    <p className="text-sm text-muted-foreground">Total Wallet Balance</p>
                    <p className="text-4xl font-bold tracking-tighter">
                        PKR {(walletData?.balance || 0).toLocaleString()}
                    </p>
                </div>
                
                <Separator />

                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Income</span>
                        <span className="font-medium">{(dailyIncome).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Invested</span>
                        <span className="font-medium">{transactionTotals.investment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Referral Income</span>
                        <span className="font-medium">{transactionTotals.referral_income.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Plans</span>
                        <span className="font-medium">{activeInvestments.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Deposit</span>
                        <span className="font-medium text-green-600">+{transactionTotals.deposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Withdraw</span>
                        <span className="font-medium text-red-600">-{transactionTotals.withdraw.toLocaleString()}</span>
                    </div>
                </div>
            </CardContent>
            <div className="absolute inset-0 w-full h-full opacity-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#chartColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
        </Card>
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

      <div className="pt-4">
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
