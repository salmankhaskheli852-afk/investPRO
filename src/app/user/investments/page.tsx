
'use client';

import React from 'react';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { InvestmentPlan, User, Wallet, PlanCategory } from '@/lib/data';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    () => firestore && user ? query(collection(firestore, 'investment_plans'), orderBy('createdAt', 'desc')) : null,
    [firestore, user]
  );
  const { data: investmentPlans, isLoading: isLoadingPlans } = useCollection<InvestmentPlan>(plansQuery);

  const categoriesQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'plan_categories'), orderBy('createdAt', 'asc')) : null,
    [firestore, user]
  );
  const { data: planCategories, isLoading: isLoadingCategories } = useCollection<PlanCategory>(categoriesQuery);

  const isLoading = isLoadingPlans || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Explore Investment Plans</h1>
          <p className="text-muted-foreground">Choose a plan that fits your financial goals.</p>
        </div>
        <p>Loading categories and plans...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Explore Investment Plans</h1>
        <p className="text-muted-foreground">Choose a plan that fits your financial goals.</p>
      </div>

      <Tabs defaultValue={planCategories?.[0]?.id || ''} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto">
              {planCategories?.map(category => (
                <TabsTrigger key={category.id} value={category.id} className="text-sm">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
        </ScrollArea>
        
        {planCategories?.map(category => {
          const plansInCategory = investmentPlans?.filter(plan => plan.categoryId === category.id);
          return (
            <TabsContent key={category.id} value={category.id}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 pt-4">
                {plansInCategory?.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">No plans available in this category.</p>
                ) : (
                  plansInCategory?.map((plan) => (
                    <InvestmentPlanCard 
                      key={plan.id} 
                      plan={plan} 
                      userWalletBalance={walletData?.balance}
                      isPurchased={userData?.investments?.some(inv => inv.planId === plan.id)}
                      showAsPurchased
                    />
                  ))
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
