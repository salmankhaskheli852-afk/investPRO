
'use client';

import Image from 'next/image';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { InvestmentPlan, User, UserInvestment } from '@/lib/data';
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
import { CheckCircle, Info, Wallet, Timer, XCircle, PackageX, Repeat, CalendarCheck, CalendarX } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, arrayUnion, writeBatch, collection, serverTimestamp, Timestamp, increment, runTransaction } from 'firebase/firestore';
import { format } from 'date-fns';

interface InvestmentPlanCardProps {
  plan: InvestmentPlan;
  isPurchased?: boolean;
  userWalletBalance?: number;
  showAsPurchased?: boolean;
  showPurchaseButton?: boolean;
  userData?: User | null;
  purchaseDate?: Timestamp;
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
  userData = null,
  purchaseDate,
}: InvestmentPlanCardProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const userPurchaseCount = React.useMemo(() => {
    if (!userData || !userData.investments) return 0;
    return userData.investments.filter(inv => inv.planId === plan.id).length;
  }, [userData, plan.id]);

  const canAfford = userWalletBalance >= plan.price;
  const isOfferActive = plan.isOfferEnabled && plan.offerEndTime && plan.offerEndTime.toMillis() > Date.now();
  const isOfferExpired = plan.isOfferEnabled && plan.offerEndTime && plan.offerEndTime.toMillis() <= Date.now();
  const isSoldOutByLimit = plan.purchaseLimit && plan.purchaseLimit > 0 && (plan.purchaseCount || 0) >= plan.purchaseLimit;
  const isSoldOut = plan.isSoldOut || isSoldOutByLimit;

  const hasReachedUserLimit = plan.purchaseLimit && plan.purchaseLimit > 0 && userPurchaseCount >= plan.purchaseLimit;


  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (isSoldOutByLimit) {
      setProgress(100);
    } else if (plan.purchaseLimit && plan.purchaseLimit > 0) {
      const p = (plan.purchaseCount || 0) / plan.purchaseLimit;
      setProgress(Math.min(p * 100, 100));
    } else if (isOfferActive && plan.createdAt && plan.offerEndTime) {
       const now = Timestamp.now().toMillis();
       const start = plan.createdAt.toMillis();
       const end = plan.offerEndTime.toMillis();
       const totalDuration = end - start;
       const elapsed = now - start;
       setProgress(Math.min((elapsed / totalDuration) * 100, 100));
    }
  }, [isSoldOutByLimit, plan, isOfferActive]);


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
            const userDoc = await transaction.get(userRef);

            if (!planDoc.exists()) throw new Error("Plan does not exist.");
            if (!walletDoc.exists()) throw new Error("User wallet not found.");
            if (!userDoc.exists()) throw new Error("User not found.");

            const currentPlanData = planDoc.data() as InvestmentPlan;
            const currentWalletData = walletDoc.data();
            const currentUserData = userDoc.data() as User;
            
            const currentUserPurchaseCount = currentUserData.investments.filter(inv => inv.planId === plan.id).length;
            if (currentPlanData.purchaseLimit && currentPlanData.purchaseLimit > 0 && currentUserPurchaseCount >= currentPlanData.purchaseLimit) {
                throw new Error("You have reached the purchase limit for this plan.");
            }
            
            if (currentPlanData.isSoldOut || (currentPlanData.purchaseLimit && (currentPlanData.purchaseCount || 0) >= currentPlanData.purchaseLimit)) {
                throw new Error("This plan is sold out.");
            }
            if ((currentWalletData.balance || 0) < plan.price) {
                throw new Error("Insufficient balance.");
            }

            transaction.update(planRef, { purchaseCount: increment(1) });
            
            const newInvestment: UserInvestment = {
              planId: plan.id,
              purchaseDate: Timestamp.now(),
              lastPayout: Timestamp.now(), // Set initial payout to now
              totalPayout: 0,
              isActive: true,
            };

            transaction.update(userRef, {
                investments: arrayUnion(newInvestment)
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
  
  let expiryDate = null;
  if(purchaseDate) {
    const date = purchaseDate.toDate();
    date.setDate(date.getDate() + plan.incomePeriod);
    expiryDate = date;
  }

  const getButtonState = () => {
    if (isSoldOut) return { text: 'Sold Out', disabled: true, icon: PackageX };
    if (isOfferExpired) return { text: 'Plan Closed', disabled: true, icon: XCircle };
    if (hasReachedUserLimit) return { text: 'Limit Reached', disabled: true, icon: Repeat };
    return { text: 'Purchase Plan', disabled: false, icon: null };
  }

  const buttonState = getButtonState();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "w-full rounded-lg shadow-md bg-blue-50 transition-all duration-300 hover:shadow-xl p-2 space-y-1",
          buttonState.disabled && 'opacity-60'
        )}
      >
        <h3 className="font-bold text-sm text-foreground px-1">{plan.name}</h3>

        <div className="flex flex-row gap-3">
          <div className="relative w-1/4 aspect-square">
            <Image
              src={plan.imageUrl}
              alt={plan.name}
              fill
              className="object-cover rounded-md"
              data-ai-hint={plan.imageHint}
            />
             {isOfferActive && plan.offerEndTime && <CountdownTimer endTime={plan.offerEndTime} />}
          </div>

          <div className="flex-1 flex flex-col justify-center text-sm space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Product price</span>
              <span className="font-bold text-foreground">{plan.price.toLocaleString()} Rs</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Daily income</span>
              <span className="font-bold text-foreground">{dailyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Rs</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Income period</span>
              <span className="font-bold text-foreground">{plan.incomePeriod} days</span>
            </div>
             {plan.purchaseLimit && plan.purchaseLimit > 0 && !isPurchased && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Limit</span>
                  <span className="font-bold text-foreground">{userPurchaseCount} / {plan.purchaseLimit}</span>
                </div>
            )}
             {isPurchased && purchaseDate && expiryDate && (
                <>
                    <div className="flex justify-between text-xs pt-1">
                        <span className="text-muted-foreground flex items-center gap-1"><CalendarCheck className="w-3 h-3" /> Purchased</span>
                        <span className="font-medium text-foreground">{format(purchaseDate.toDate(), 'dd MMM, yy')}</span>
                    </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><CalendarX className="w-3 h-3" /> Expires</span>
                        <span className="font-medium text-foreground">{format(expiryDate, 'dd MMM, yy')}</span>
                    </div>
                </>
             )}
          </div>
        </div>
        
        {(plan.purchaseLimit && plan.purchaseLimit > 0) && !isPurchased && (
            <div className="relative pt-1">
                <Progress value={progress} className="h-1.5" />
                <div className="absolute -top-0 right-1 text-[10px] font-bold text-gray-600">
                    {Math.round(progress)}%
                </div>
            </div>
        )}

        {showPurchaseButton && (
          <DialogTrigger asChild>
            <Button
              className="w-full mt-1 flex items-center gap-2"
              size="sm"
              disabled={buttonState.disabled}
            >
              {buttonState.icon && <buttonState.icon className="w-4 h-4" />}
              {buttonState.text}
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
          {hasReachedUserLimit && (
            <p className="text-sm text-center text-amber-600">You have already reached the purchase limit for this plan.</p>
          )}
          {!hasReachedUserLimit && !canAfford && (
            <p className="text-sm text-center text-destructive">You do not have enough funds in your wallet to purchase this plan.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90" disabled={!canAfford || hasReachedUserLimit}>
            Confirm & Invest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
