'use client';

import React from 'react';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { planCategories } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { InvestmentPlan, User, Wallet } from '@/lib/data';
import { collection, doc } from 'firebase/firestore';

export default function UserInvestmentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const walletRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid, 'wallets', 'main') : null),
    [firestore, user]
  );
  const { data: walletData } = useDoc<Wallet>(walletRef);

  const plansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: investmentPlans, isLoading } = useCollection<InvestmentPlan>(plansQuery);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Explore Investment Plans</h1>
        <p className="text-muted-foreground">Choose a plan that fits your financial goals.</p>
      </div>

      <Tabs defaultValue={planCategories[0]?.id || ''} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {planCategories.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {planCategories.map(category => {
          const plansInCategory = investmentPlans?.filter(plan => plan.categoryId === category.id);
          return (
            <TabsContent key={category.id} value={category.id}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 pt-4">
                {isLoading && <p>Loading plans...</p>}
                {plansInCategory?.map((plan) => (
                  <InvestmentPlanCard 
                    key={plan.id} 
                    plan={plan} 
                    userWalletBalance={walletData?.balance}
                    isPurchased={userData?.investments?.includes(plan.id)}
                    showAsPurchased
                  />
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
