
'use client';

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
import { CheckCircle, Info, Wallet, Timer, XCircle, PackageX } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, arrayUnion, writeBatch, collection, serverTimestamp, Timestamp, increment, runTransaction } from 'firebase/firestore';

interface InvestmentPlanCardProps {
  plan: InvestmentPlan;
  isPurchased?: boolean;
  userWalletBalance?: number;
  showAsPurchased?: boolean;
  showPurchaseButton?: boolean;
}

function CountdownTimer({ endTime }: { endTime: { seconds: number; nanoseconds: number } }) {
  const [timeLeft, setTimeLeft] = React.useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(endTime.seconds * 1000 + endTime.nanoseconds / 1000000);
      const difference = end.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5 z-10">
      <Timer className="w-4 h-4 text-primary" />
      <div className="flex items-center gap-0.5 font-mono text-sm font-bold">
        <span>{timeLeft.days}</span>d:
        <span>{timeLeft.hours}</span>h:
        <span>{timeLeft.minutes}</span>m:
        <span>{timeLeft.seconds}</span>s
      </div>
    </div>
  );
}


export function InvestmentPlanCard({
  plan,
  isPurchased = false,
  userWalletBalance = 0,
  showAsPurchased = false,
  showPurchaseButton = true,
}: InvestmentPlanCardProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const canAfford = userWalletBalance >= plan.price;
  const isOfferActive = plan.isOfferEnabled && plan.offerEndTime && plan.offerEndTime.toMillis() > Date.now();
  const isOfferExpired = plan.isOfferEnabled && plan.offerEndTime && plan.offerEndTime.toMillis() <= Date.now();
  const isSoldOutByLimit = plan.purchaseLimit && (plan.purchaseCount || 0) >= plan.purchaseLimit;
  const isSoldOut = plan.isSoldOut || isSoldOutByLimit;


  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (isPurchased || isSoldOutByLimit) {
      const p = (plan.purchaseCount || 0) / (plan.purchaseLimit || 1);
      setProgress(Math.min(p * 100, 100));
    } else if (isOfferActive && plan.createdAt && plan.offerEndTime) {
       const now = Timestamp.now().toMillis();
       const start = plan.createdAt.toMillis();
       const end = plan.offerEndTime.toMillis();
       const totalDuration = end - start;
       const elapsed = now - start;
       setProgress(Math.min((elapsed / totalDuration) * 100, 100));
    }
  }, [isPurchased, isSoldOutByLimit, plan, isOfferActive]);


  const handlePurchase = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' });
      return;
    }
    if (!canAfford) {
      toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance.' });
      return;
    }
    
    const userRef = doc(firestore, 'users', user.uid);
    const walletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
    const planRef = doc(firestore, 'investment_plans', plan.id);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const planDoc = await transaction.get(planRef);
            const walletDoc = await transaction.get(walletRef);

            if (!planDoc.exists()) throw new Error("Plan does not exist.");
            if (!walletDoc.exists()) throw new Error("User wallet not found.");

            const currentPlanData = planDoc.data() as InvestmentPlan;
            const currentWalletData = walletDoc.data();

            if (currentPlanData.isSoldOut || (currentPlanData.purchaseLimit && (currentPlanData.purchaseCount || 0) >= currentPlanData.purchaseLimit)) {
                throw new Error("This plan is sold out.");
            }
            if ((currentWalletData.balance || 0) < plan.price) {
                throw new Error("Insufficient balance.");
            }

            transaction.update(planRef, { purchaseCount: increment(1) });
            
            transaction.update(userRef, {
                investments: arrayUnion({
                    planId: plan.id,
                    purchaseDate: Timestamp.now()
                })
            });

            // Deduct price from balance
            transaction.update(walletRef, { balance: increment(-plan.price) });

            const transactionRef = doc(collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'));
            transaction.set(transactionRef, {
                type: 'investment',
                amount: plan.price,
                status: 'completed',
                date: serverTimestamp(),
                details: {
                    planId: plan.id,
                    planName: plan.name
                },
                id: transactionRef.id,
                walletId: 'main'
            });
        });

        toast({
            title: 'Purchase Successful!',
            description: `You have successfully invested in the ${plan.name}.`,
        });
        setOpen(false);

    } catch (e: any) {
         toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message || "Could not purchase plan.",
        });
    }
  };

  const dailyIncome = plan.price * (plan.dailyIncomePercentage / 100);
  // const totalIncome = dailyIncome * plan.incomePeriod;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "w-full rounded-lg shadow-md bg-blue-50 transition-all duration-300 hover:shadow-xl p-3 space-y-2",
          (isOfferExpired || isSoldOut) && 'opacity-60'
        )}
      >
        <h3 className="font-bold text-base text-foreground">{plan.name}</h3>

        <div className="flex flex-row gap-3">
          <div className="relative w-1/3 aspect-square">
            <Image
              src={plan.imageUrl}
              alt={plan.name}
              fill
              className="object-cover rounded-md"
              data-ai-hint={plan.imageHint}
            />
          </div>

          <div className="flex-1 flex flex-col justify-between text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Product price</span>
              <span className="font-bold text-foreground">{plan.price.toLocaleString()} Rs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Daily income</span>
              <span className="font-bold text-foreground">{dailyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Rs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Income period</span>
              <span className="font-bold text-foreground">{plan.incomePeriod} days</span>
            </div>
          </div>
        </div>
        
        <div className="relative pt-2">
            <Progress value={progress} className="h-2" />
            <div className="absolute -top-1 right-0 text-xs font-bold text-gray-600">
                {Math.round(progress)}%
            </div>
        </div>

        {showPurchaseButton && (
          <DialogTrigger asChild>
            <Button
              className="w-full mt-2"
              size="sm"
              disabled={(isPurchased && showAsPurchased) || isOfferExpired || isSoldOut}
            >
              {(isPurchased && showAsPurchased) ? 'Purchased' : isSoldOut ? 'Sold Out' : (isOfferExpired ? 'Plan Closed' : 'Purchase Plan')}
            </Button>
          </DialogTrigger>
        )}
      </Card>
      
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
          <div className="rounded-lg bg-background/50 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Plan Cost</span>
              <span className="font-bold text-lg">{plan.price.toLocaleString()} Rs</span>
            </div>
          </div>
          <div className="rounded-lg bg-background/50 p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-4 h-4" /> Wallet Balance</span>
              <span>{userWalletBalance?.toLocaleString() || 0} Rs</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Remaining Balance</span>
              <span className={cn("font-medium", !canAfford && "text-destructive")}>
                {(userWalletBalance - plan.price).toLocaleString()} Rs
              </span>
            </div>
          </div>
          {isPurchased && (
            <p className="text-sm text-center text-amber-600">You have already purchased this plan.</p>
          )}
          {!isPurchased && !canAfford && (
            <p className="text-sm text-center text-destructive">You do not have enough funds in your wallet to purchase this plan.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90" disabled={!canAfford || isPurchased}>
            Confirm & Invest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    