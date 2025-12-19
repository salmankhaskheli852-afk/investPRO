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
}

export function InvestmentPlanCard({ plan }: InvestmentPlanCardProps) {
  const { toast } = useToast();

  const handlePurchase = () => {
    toast({
      title: 'Purchase Successful!',
      description: `You have successfully invested in the ${plan.name}.`,
    });
  };

  return (
    <Card className={cn("w-full overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-lg border-2 border-transparent", `hover:border-primary`)}>
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold text-lg">{plan.name}</h3>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Image
            src={plan.imageUrl}
            alt={plan.name}
            width={128}
            height={96}
            className="rounded-md object-cover aspect-[4/3] w-full sm:w-32"
            data-ai-hint={plan.imageHint}
          />
          <div className="flex-1 w-full text-sm">
            <div className="flex justify-between"><span>Product price</span> <span className="font-medium">{plan.price.toLocaleString()} Rs</span></div>
            <div className="flex justify-between"><span>Daily income</span> <span className="font-medium">{plan.dailyIncome.toLocaleString()} Rs</span></div>
            <div className="flex justify-between"><span>Income period</span> <span className="font-medium">{plan.incomePeriod}</span></div>
          </div>
        </div>
        <div>
          <Progress value={10} className="h-2" />
        </div>
        <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handlePurchase}>
          Purchase Plan
        </Button>
      </CardContent>
    </Card>
  );
}
