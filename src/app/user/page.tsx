
'use client';

import React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, query, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { InvestmentPlan, User, Wallet, Transaction, UserInvestment } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Banknote, FileText, Landmark, ShieldQuestion, Users, LogOut, Briefcase } from 'lucide-react';

const StatItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-bold text-lg">{value}</p>
    </div>
)

const MenuItem = ({ icon: Icon, label, href }: { icon: React.ElementType, label: string, href: string }) => (
    <Link href={href} className="flex items-center p-3 space-x-4 rounded-lg hover:bg-muted">
        <Icon className="w-6 h-6 text-primary" />
        <span className="font-medium">{label}</span>
    </Link>
);


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

  const transactionTotals = React.useMemo(() => {
    if (!transactions) return { deposit: 0, withdraw: 0, income: 0, referral_income: 0, investment: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit') acc.deposit += tx.amount;
        else if (tx.type === 'withdrawal') acc.withdraw += tx.amount;
        else if (tx.type === 'income') acc.income += tx.amount;
        else if (tx.type === 'referral_income') acc.referral_income += tx.amount;
        else if (tx.type === 'investment') acc.investment += tx.amount;
      }
      return acc;
    }, { deposit: 0, withdraw: 0, income: 0, referral_income: 0, investment: 0 });
  }, [transactions]);


  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isUserDocLoading || isWalletLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user || !userData) {
      return null;
  }

  const todayIncome = 0; // This would require more complex querying

  return (
    <div className="space-y-6">
        {/* Top Stats Card */}
        <Card className="shadow-lg">
            <CardContent className="p-4">
                <div className="relative">
                    {/* Wavy Background */}
                    <div className="absolute top-0 left-0 right-0 h-24 bg-blue-100/50 rounded-t-lg" style={{ clipPath: 'ellipse(100% 55% at 50% 45%)' }}></div>
                    
                    <div className="relative z-10 p-4">
                        <div className="grid grid-cols-2 gap-4 text-center mb-6">
                            <div>
                                <p className="text-sm text-muted-foreground">Balance wallet</p>
                                <p className="text-2xl font-bold">Rs {(walletData?.balance || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Recharge wallet</p>
                                <p className="text-2xl font-bold">Rs {(walletData?.balance || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-y-4">
                            <StatItem label="Total income" value={(transactionTotals.income + transactionTotals.referral_income).toLocaleString()} />
                            <StatItem label="Total recharge" value={transactionTotals.deposit.toLocaleString()} />
                            <StatItem label="Total assets" value={(walletData?.balance || 0).toLocaleString()} />
                            <StatItem label="Total withdraw" value={transactionTotals.withdraw.toLocaleString()} />
                            <StatItem label="Today's income" value={todayIncome.toLocaleString()} />
                            <StatItem label="Team income" value={transactionTotals.referral_income.toLocaleString()} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="shadow-lg">
            <CardContent className="p-2 space-y-1">
                <MenuItem icon={Users} label="Team fund" href="/user/invitation" />
                <MenuItem icon={FileText} label="Funding details" href="/user/history" />
                <MenuItem icon={Briefcase} label="Withdrawal Record" href="/user/history" />
                <MenuItem icon={ShieldQuestion} label="Login Password" href="#" />
                <MenuItem icon={Landmark} label="My bank account" href="#" />
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardContent className="p-2 space-y-1">
                <MenuItem icon={Banknote} label="Online Service" href="#" />
                <MenuItem icon={LogOut} label="Sign out" href="#" />
            </CardContent>
        </Card>
    </div>
  );
}
