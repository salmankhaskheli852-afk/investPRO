"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Zap, CircleDollarSign } from 'lucide-react';
import type { InvestmentPlan } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface InvestmentPlanCardProps {
  plan: InvestmentPlan;
}

export function InvestmentPlanCard({ plan }: InvestmentPlanCardProps) {
  const { toast } = useToast();

  const handlePurchase = () => {
    // This is a subtle animation/feedback as requested.
    toast({
      title: 'Purchase Successful!',
      description: `You have successfully invested in the ${plan.name}.`,
    });
  };

  return (
    <Card className={cn(
      "w-full overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-lg border-2 border-transparent",
      `hover:border-primary`
    )}>
      <div className="relative h-48 w-full">
        <Image
          src={plan.imageUrl}
          alt={plan.name}
          fill
          className="object-cover"
          data-ai-hint={plan.imageHint}
        />
        <div className={cn("absolute inset-0 bg-gradient-to-t from-black/80 to-transparent", plan.color)} />
        <CardHeader className="relative h-full flex flex-col justify-end">
          <CardTitle className="font-headline text-2xl font-bold text-white drop-shadow-md">{plan.name}</CardTitle>
        </CardHeader>
      </div>
      <CardContent className="flex-grow p-6 space-y-4">
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-primary">${plan.price}</span>
          <span className="ml-1 text-muted-foreground">/ investment</span>
        </div>
        <div className="space-y-3 pt-4 text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4 text-accent" />
              <span>Daily Income</span>
            </div>
            <span className="font-semibold text-foreground">{plan.dailyIncome}%</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span>Total Income</span>
            </div>
            <span className="font-semibold text-foreground">${plan.totalIncome}</span>
          </div>
           <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CircleDollarSign className="w-4 h-4 text-accent" />
              <span>Net Profit</span>
            </div>
            <span className="font-semibold text-green-600">${plan.totalIncome - plan.price}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handlePurchase}>
          Purchase Plan
        </Button>
      </CardFooter>
    </Card>
  );
}
