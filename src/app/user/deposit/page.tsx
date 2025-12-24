
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogClose } from '@radix-ui/react-dialog';

export default function DepositPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  
  const [amount, setAmount] = React.useState('');
  
  const [senderName, setSenderName] = React.useState('');
  const [senderAccount, setSenderAccount] = React.useState('');
  
  const [savedDetails, setSavedDetails] = React.useState<{name: string, account: string} | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  const handlePresetAmountClick = (presetAmount: number) => {
    setAmount(String(presetAmount));
    setSavedDetails(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setSavedDetails(null);
  };
  
  const handleSaveDetails = () => {
     if (!senderName || !senderAccount) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields.' });
        return;
    }
    setSavedDetails({ name: senderName, account: senderAccount });
    setIsDialogOpen(false);
    toast({ title: 'Details Saved', description: 'Your sender details have been saved. You can now proceed to pay.' });
  }

  const handlePayNow = () => {
    if (!amount || !savedDetails) {
        toast({ variant: 'destructive', title: 'Information Missing', description: 'Please enter an amount and save your details first.' });
        return;
    }

    const queryParams = new URLSearchParams({
        amount,
        senderName: savedDetails.name,
        senderAccount: savedDetails.account,
    });
    
    router.push(`/user/recharge?${queryParams.toString()}`);
  };

  const handleYourDetailClick = () => {
    if (!amount) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter an amount first.',
      });
      return;
    }
    setSenderName(savedDetails?.name || '');
    setSenderAccount(savedDetails?.account || '');
    setIsDialogOpen(true);
  };

  return (
    <div className="bg-muted/30 -m-4 sm:-m-6 lg:-m-8 min-h-screen">
       <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-transparent px-4">
        <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
                <Link href="/user">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </Button>
           <h1 className="text-xl font-bold text-foreground">Recharge</h1>
        </div>
      </div>
      
      <div className="p-4">
        <Card className="rounded-2xl shadow-lg border-none bg-card/80">
            <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="amount" className="sr-only">Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">Rs</span>
                        <input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0"
                            className="h-14 w-full border-b-2 border-primary bg-transparent pl-12 text-2xl font-bold focus:outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Choose Amount</h3>
                    {isLoadingSettings ? (
                        <p>Loading presets...</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                           {appSettings?.rechargePresetAmounts?.sort((a,b) => a-b).map(preset => (
                                <Button 
                                    key={preset}
                                    variant={String(preset) === amount ? 'default' : 'outline'}
                                    onClick={() => handlePresetAmountClick(preset)}
                                >
                                    {preset.toLocaleString()} Rs
                                </Button>
                           ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 space-y-4">
                  <Button
                      size="lg"
                      className="w-full h-12 text-lg rounded-full"
                      onClick={handleYourDetailClick}
                      disabled={!amount}
                  >
                      Your Detail
                  </Button>
                  
                  {savedDetails && (
                      <Button
                          size="lg"
                          className="w-full h-12 text-lg rounded-full"
                          onClick={handlePayNow}
                      >
                         Pay Now
                      </Button>
                  )}
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Your Payment Details</DialogTitle>
                  <DialogDescription>
                      Enter the details of the account from which you sent the payment.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">

                  <div className="space-y-2">
                      <Label htmlFor="sender-name">Your Name (Sender)</Label>
                      <Input id="sender-name" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g., John Doe" />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="sender-account">Your Account Number (Sender)</Label>
                      <Input id="sender-account" value={senderAccount} onChange={e => setSenderAccount(e.target.value)} placeholder="e.g., 03001234567" />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSaveDetails}>
                      Save Details
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
