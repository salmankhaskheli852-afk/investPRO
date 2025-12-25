
'use client';

import React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, orderBy, query, Timestamp, writeBatch, increment, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { InvestmentPlan, User, Wallet, Transaction, UserInvestment, AppSettings } from '@/lib/data';
import { DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine, LogOut, Wallet as WalletIcon, GitBranch, Copy, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    () => firestore && user ? collection(firestore, 'investment_plans') : null,
    [firestore, user]
  );
  const { data: allPlans } = useCollection<InvestmentPlan>(plansQuery);
  
  const settingsRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore, user]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  // --- Daily Income Calculation Logic ---
  React.useEffect(() => {
    if (!user || !userData || !allPlans || !firestore) return;
    
    const calculateAndDistributeIncome = async () => {
      try {
        await runTransaction(firestore, async (transaction) => {
          const now = Timestamp.now();
          const userRef = doc(firestore, 'users', user.uid);
          const walletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');

          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User not found for income calculation.");
          const currentUserData = userDoc.data() as User;
          
          let totalIncomeToDistribute = 0;
          const updatedInvestments: UserInvestment[] = [];
          
          for (const investment of currentUserData.investments) {
            if (!investment.isActive) {
                updatedInvestments.push(investment);
                continue;
            }

            const plan = allPlans.find(p => p.id === investment.planId);
            if (!plan) {
                updatedInvestments.push(investment); // Keep it even if plan is deleted
                continue;
            }

            const purchaseDate = investment.purchaseDate.toDate();
            const planEndDate = new Date(purchaseDate.getTime());
            planEndDate.setDate(planEndDate.getDate() + plan.incomePeriod);

            if (now.toDate() < purchaseDate) { // Should not happen, but for safety
                updatedInvestments.push(investment);
                continue;
            }

            const lastPayoutDate = investment.lastPayout ? investment.lastPayout.toDate() : purchaseDate;
            let currentPayoutDate = new Date(lastPayoutDate.getTime());
            let daysToPay = 0;

            // Calculate how many 24-hour cycles have passed
            while (true) {
                const nextPayoutTime = new Date(currentPayoutDate.getTime());
                nextPayoutTime.setDate(nextPayoutTime.getDate() + 1);

                if (nextPayoutTime <= now.toDate() && nextPayoutTime <= planEndDate) {
                    daysToPay++;
                    currentPayoutDate = nextPayoutTime;
                } else {
                    break;
                }
            }

            if (daysToPay > 0) {
              const dailyIncome = plan.price * (plan.dailyIncomePercentage / 100);
              const incomeForThisPlan = dailyIncome * daysToPay;
              totalIncomeToDistribute += incomeForThisPlan;

              const newTotalPayout = (investment.totalPayout || 0) + incomeForThisPlan;

              // Log transaction for this plan's income
              const incomeTxRef = doc(collection(firestore, `users/${user.uid}/wallets/main/transactions`));
              transaction.set(incomeTxRef, {
                id: incomeTxRef.id,
                type: 'income',
                amount: incomeForThisPlan,
                status: 'completed',
                date: serverTimestamp(),
                walletId: 'main',
                details: { planId: plan.id, planName: plan.name, days: daysToPay }
              });

              const isPlanComplete = now.toDate() >= planEndDate;

              updatedInvestments.push({
                  ...investment,
                  lastPayout: Timestamp.fromDate(currentPayoutDate),
                  totalPayout: newTotalPayout,
                  isActive: !isPlanComplete, // Deactivate if plan period is over
              });
            } else {
              // If no days to pay, check if the plan has expired anyway
              const isPlanComplete = now.toDate() >= planEndDate;
              if (isPlanComplete && investment.isActive) {
                  updatedInvestments.push({ ...investment, isActive: false });
              } else {
                  updatedInvestments.push(investment);
              }
            }
          }
          
          // Batch the final updates
          if (totalIncomeToDistribute > 0) {
            transaction.update(walletRef, { balance: increment(totalIncomeToDistribute) });
          }
          transaction.update(userRef, { investments: updatedInvestments, lastIncomeCheck: now });
        });
      } catch (error) {
        console.error("Failed to distribute daily income: ", error);
        // We don't toast here to not bother the user with background errors.
      }
    };
    
    // Only run if there are active investments and it's been some time since the last check
    if (userData.investments.some(inv => inv.isActive)) {
        const lastCheck = userData.lastIncomeCheck?.toDate() ?? new Date(0);
        const now = new Date();
        // Check every 5 minutes to avoid excessive runs
        if (now.getTime() - lastCheck.getTime() > 5 * 60 * 1000) {
            calculateAndDistributeIncome();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, allPlans, firestore]); // This effect should run when user data or plans load


  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/auth/sign-up');
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
      router.push('/auth/sign-up');
    }
  }, [user, isUserLoading, router]);

  const activeInvestments = React.useMemo(() => {
    if (!userData?.investments || !allPlans) return [];
    
    return userData.investments
      .filter(inv => inv.isActive)
      .map(investment => {
        return allPlans.find(plan => plan.id === investment.planId);
      }).filter((plan): plan is InvestmentPlan => !!plan);
  }, [userData, allPlans]);

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

  if (isUserLoading || isUserDocLoading || isWalletLoading || isLoadingTransactions || isLoadingSettings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user || !userData) {
      return null;
  }

  const showVerifiedBadge = appSettings?.isVerificationBadgeEnabled && userData.isVerified;
  const effectiveBalance = (walletData?.balance || 0);
  
  return (
    <div className="space-y-8">
      <Card className="rounded-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
                 {showVerifiedBadge && (
                    <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{appSettings.verificationBadgeText || 'Verified'}</span>
                    </div>
                 )}
              </div>
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
        </CardContent>
      </Card>
      
      <div className="rounded-lg bg-gray-900 text-white relative overflow-hidden">
           <div className="p-6 relative z-10">
                <div className="flex flex-col items-center text-center space-y-2 mb-6">
                    <p className="text-sm text-gray-400">Total Wallet Balance</p>
                    <p className="text-5xl font-bold tracking-tighter">
                        PKR {effectiveBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                </div>
                
                <Separator className="bg-white/10" />

                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Total Income</span>
                        <span className="font-medium">{transactionTotals.income.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Total Invested</span>
                        <span className="font-medium">{transactionTotals.investment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Referral Income</span>
                        <span className="font-medium">{transactionTotals.referral_income.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Active Plans</span>
                        <span className="font-medium">{activeInvestments.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Total Deposit</span>
                        <span className="font-medium text-green-400">+{transactionTotals.deposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Total Withdraw</span>
                        <span className="font-medium text-red-400">-{transactionTotals.withdraw.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div className="absolute inset-0 w-full h-full opacity-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartColorVip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#chartColorVip)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
      </div>

      <Card className="rounded-lg">
        <CardContent className="p-6 space-y-6">
          <div>
            <CardHeader className="p-0 mb-4">
              <CardTitle>My Active Investments</CardTitle>
              <CardDescription>
                Here's an overview of your current investment portfolio.
              </CardDescription>
            </CardHeader>
            <div>
              {activeInvestments.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {activeInvestments.map((plan, index) => (
                    <InvestmentPlanCard key={`${plan.id}-${index}`} plan={plan} isPurchased={true} showPurchaseButton={false} />
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
            </div>
          </div>

          <Separator />

          <div className="p-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
