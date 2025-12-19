"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { InvestmentPlan } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface InvestmentPlanCardProps {
  plan: InvestmentPlan;
  purchased?: boolean;
}

export function InvestmentPlanCard({ plan, purchased = false }: InvestmentPlanCardProps) {
  const { toast } = useToast();

  const handlePurchase = () => {
    toast({
      title: 'Purchase Successful!',
      description: `You have successfully invested in the ${plan.name}.`,
    });
  };

  return (
    <Card className={cn("w-full overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-lg border-2 border-transparent", `hover:border-primary`)}>
      <div className="relative aspect-[3/4] w-full">
        <Image
          src={plan.imageUrl}
          alt={plan.name}
          fill
          className="object-cover"
          data-ai-hint={plan.imageHint}
        />
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{plan.name}</h3>
          <span className="font-bold text-primary">{plan.price.toLocaleString()} Rs</span>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
            <div className="flex justify-between"><span>Daily income:</span> <span className="font-medium text-foreground">{plan.dailyIncome.toLocaleString()} Rs</span></div>
            <div className="flex justify-between"><span>Period:</span> <span className="font-medium text-foreground">{plan.incomePeriod} days</span></div>
        </div>
        
        {purchased ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>63%</span>
            </div>
            <Progress value={63} className="h-2" />
          </div>
        ) : (
          <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handlePurchase}>
            Purchase Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
