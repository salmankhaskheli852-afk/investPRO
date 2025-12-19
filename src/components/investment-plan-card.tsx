
"use client";

import Image from 'next/image';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { InvestmentPlan } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle, Info, Wallet } from 'lucide-react';

interface InvestmentPlanCardProps {
  plan: InvestmentPlan;
  isPurchased?: boolean;
  userWalletBalance: number;
  showAsPurchased?: boolean;
}

export function InvestmentPlanCard({ plan, isPurchased = false, userWalletBalance, showAsPurchased = false }: InvestmentPlanCardProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const canAfford = userWalletBalance >= plan.price;

  // Simulate plan progress
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (isPurchased) {
      // Simulate progress over the income period.
      setProgress(Math.floor(Math.random() * 60) + 10);
    }
  }, [isPurchased]);

  const handlePurchase = () => {
    // In a real app, you'd call an API here.
    toast({
      title: 'Purchase Successful!',
      description: `You have successfully invested in the ${plan.name}.`,
    });
    setOpen(false);
    // Here you would typically update the user's data.
  };

  const totalIncome = plan.dailyIncome * plan.incomePeriod;

  const renderPurchaseButton = () => {
    if (showAsPurchased && isPurchased) {
      return <Button size="lg" className="w-full" disabled>Purchased</Button>;
    }

    if (isPurchased && !showAsPurchased) {
        return (
            <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{plan.incomePeriod - Math.floor(plan.incomePeriod * (progress/100))} days left</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>
        );
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={!canAfford}>
            {canAfford ? 'Purchase Plan' : 'Insufficient Funds'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="text-primary" />
              Confirm Purchase
            </DialogTitle>
            <DialogDescription>
              Review the details before confirming your investment in the <span className="font-bold text-foreground">{plan.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-background/50 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan Cost</span>
                <span className="font-bold text-lg">{plan.price.toLocaleString()} Rs</span>
              </div>
               <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Potential Income</span>
                <span className="font-bold text-lg text-green-600">{totalIncome.toLocaleString()} Rs</span>
              </div>
            </div>

            <div className="rounded-lg border bg-background/50 p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-4 h-4" /> Current Balance</span>
                  <span>{userWalletBalance.toLocaleString()} Rs</span>
              </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Remaining Balance</span>
                  <span className="font-medium">{(userWalletBalance - plan.price).toLocaleString()} Rs</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90">
              Confirm & Invest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={cn("w-full overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl shadow-lg border-2 border-transparent", `hover:border-primary`)}>
      <div className="relative aspect-video w-full">
        <Image
          src={plan.imageUrl}
          alt={plan.name}
          fill
          className="object-cover"
          data-ai-hint={plan.imageHint}
        />
         {isPurchased && !showAsPurchased && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Active</span>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-4 flex flex-col flex-1">
        <h3 className="font-headline font-bold text-xl text-foreground">{plan.name}</h3>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground flex-1">
            <div className="flex flex-col"><span>Product price</span> <span className="font-medium text-foreground text-base">{plan.price.toLocaleString()} Rs</span></div>
            <div className="flex flex-col text-right"><span>Daily income</span> <span className="font-medium text-foreground text-base">{plan.dailyIncome.toLocaleString()} Rs</span></div>
            <div className="flex flex-col"><span>Period</span> <span className="font-medium text-foreground text-base">{plan.incomePeriod} days</span></div>
            <div className="flex flex-col text-right"><span>Total income</span> <span className="font-medium text-foreground text-base">{totalIncome.toLocaleString()} Rs</span></div>
        </div>
        
        {renderPurchaseButton()}
      </CardContent>
    </Card>
  );
}
