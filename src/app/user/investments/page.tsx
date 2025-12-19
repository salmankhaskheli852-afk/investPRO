
'use client';

import React from 'react';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { investmentPlans, planCategories } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UserInvestmentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Explore Investment Plans</h1>
        <p className="text-muted-foreground">Choose a plan that fits your financial goals.</p>
      </div>

      <Tabs defaultValue={planCategories[0]?.id || ''} className="w-full">
        <TabsList>
          {planCategories.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {planCategories.map(category => {
          const plansInCategory = investmentPlans.filter(plan => plan.categoryId === category.id);
          return (
            <TabsContent key={category.id} value={category.id}>
              <div className="space-y-6 pt-4">
                <p className="text-muted-foreground">Plans in the {category.name.toLowerCase()} category.</p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {plansInCategory.map((plan) => (
                    <InvestmentPlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
