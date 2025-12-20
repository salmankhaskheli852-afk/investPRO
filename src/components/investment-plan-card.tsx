
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
        setTimeLeft({ hours: '00', minutes: '00', seconds: '00' });
        // Optional: Trigger a refetch or state update to mark the plan as expired globally
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
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
          <span>{timeLeft.hours}</span>:<span>{timeLeft.minutes}</span>:<span>{timeLeft.seconds}</span>
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
  const isSoldOut = plan.purchaseLimit && (plan.purchaseCount || 0) >= plan.purchaseLimit;

  // Simulate plan progress
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (isPurchased) {
      // Simulate progress over the income period.
      setProgress(Math.floor(Math.random() * 60) + 10);
    }
  }, [isPurchased]);

  const handlePurchase = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' });
      return;
    }
    if (!canAfford) {
      toast({ variant: 'destructive', title: 'Error', description: 'Insufficient funds.' });
      return;
    }
    
    const userRef = doc(firestore, 'users', user.uid);
    const walletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
    const planRef = doc(firestore, 'investment_plans', plan.id);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            // --- READS FIRST ---
            const planDoc = await transaction.get(planRef);
            const walletDoc = await transaction.get(walletRef);

            if (!planDoc.exists()) {
                throw new Error("Plan does not exist.");
            }
            if (!walletDoc.exists()) {
                throw new Error("User wallet not found.");
            }

            const currentPlanData = planDoc.data() as InvestmentPlan;
            const currentBalance = walletDoc.data().balance;

            // --- VALIDATION ---
            if (currentPlanData.purchaseLimit && (currentPlanData.purchaseCount || 0) >= currentPlanData.purchaseLimit) {
                throw new Error("This plan is sold out.");
            }
            if (currentBalance < plan.price) {
                throw new Error("Insufficient funds.");
            }

            // --- WRITES LAST ---
            // 1. Update purchase count on plan
            transaction.update(planRef, { purchaseCount: increment(1) });
            
            // 2. Add investment to user's profile with purchase date
            transaction.update(userRef, {
                investments: arrayUnion({
                    planId: plan.id,
                    purchaseDate: Timestamp.now()
                })
            });

            // 3. Deduct price from wallet
            const newBalance = currentBalance - plan.price;
            transaction.update(walletRef, { balance: newBalance });

            // 4. Add an investment transaction
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
  const totalIncome = dailyIncome * plan.incomePeriod;

  const renderPurchaseButton = () => {
    // This button is for the dashboard view where progress is shown.
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

    if (!showPurchaseButton) {
      return null;
    }

    // This is for the main investment page view.
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/90"
            disabled={(isPurchased && showAsPurchased) || isOfferExpired || isSoldOut}
          >
            {isPurchased && showAsPurchased ? 'Purchased' : isSoldOut ? 'Sold Out' : (isOfferExpired ? 'Plan Closed' : 'Purchase Plan')}
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
                <p className="text-sm text-center text-destructive">You do not have enough funds to purchase this plan.</p>
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


  return (
    <div className={cn("rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500 transition-all duration-300 hover:shadow-xl", (isOfferExpired || isSoldOut) && 'opacity-60')}>
      <Card className={cn("w-full overflow-hidden flex flex-col h-full")}>
        <div className="relative aspect-[4/3] w-full">
          {isOfferActive && plan.offerEndTime && <CountdownTimer endTime={plan.offerEndTime} />}
          <Image
            src={plan.imageUrl}
            alt={plan.name}
            fill
            className="object-cover"
            data-ai-hint={plan.imageHint}
          />
          {isPurchased && showAsPurchased && (
              <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Purchased</span>
              </div>
          )}
          {isPurchased && !showAsPurchased && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Active</span>
            </div>
          )}
          {isOfferExpired && !isSoldOut && (
              <div className="absolute top-2 left-2 bg-destructive/80 backdrop-blur-sm text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  <span>Closed</span>
              </div>
          )}
          {isSoldOut && (
              <div className="absolute top-2 left-2 bg-slate-500/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <PackageX className="w-3 h-3" />
                  <span>Sold Out</span>
              </div>
          )}
        </div>
        <CardContent className="p-3 space-y-3 flex flex-col flex-1">
          <h3 className="font-headline font-bold text-lg text-foreground">{plan.name}</h3>
          
          <div className="flex-1 space-y-3">
              <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Product price</span> 
                  <span className="font-bold text-foreground text-xl">{plan.price.toLocaleString()} Rs</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                      <span className="text-muted-foreground">Daily income</span> 
                      <span className="font-medium text-foreground">{dailyIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Rs</span>
                  </div>
                  <div className="flex flex-col text-right">
                      <span className="text-muted-foreground">Period</span> 
                      <span className="font-medium text-foreground">{plan.incomePeriod} days</span>
                  </div>
              </div>
          </div>
          
          {renderPurchaseButton()}
        </CardContent>
      </Card>
    </div>
  );
}
