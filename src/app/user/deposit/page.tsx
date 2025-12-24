
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { AdminWallet, AppSettings, Transaction } from '@/lib/data';
import { collection, doc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DepositPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  
  const [amount, setAmount] = React.useState('');
  
  // Step 2 state
  const [senderName, setSenderName] = React.useState('');
  const [senderAccount, setSenderAccount] = React.useState('');
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'admin_wallets') : null),
    [firestore, user]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const activeAdminWallets = React.useMemo(() => {
    return adminWallets?.filter(wallet => wallet.isEnabled) || [];
  }, [adminWallets]);
  
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  const handlePresetAmountClick = (presetAmount: number) => {
    setAmount(String(presetAmount));
  };
  
  const handleSubmitRequest = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    if (!amount || !senderName || !senderAccount) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields in the form.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const numericAmount = parseFloat(amount);
        const batch = writeBatch(firestore);

        const newTransactionRef = doc(collection(firestore, 'transactions'));
        const transactionData: Omit<Transaction, 'id'|'date'> & { date: any } = {
            type: 'deposit',
            amount: numericAmount,
            status: 'pending',
            date: serverTimestamp(),
            walletId: 'main',
            details: {
                userId: user.uid,
                senderName,
                senderAccount,
            },
        };

        batch.set(newTransactionRef, { ...transactionData, id: newTransactionRef.id });

        const userTransactionRef = doc(collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'), newTransactionRef.id);
        batch.set(userTransactionRef, { ...transactionData, id: newTransactionRef.id });

        await batch.commit();
        
        toast({ title: 'Success!', description: 'Your deposit request has been submitted and is pending review.' });
        setIsDialogOpen(false);
        router.push('/user/history');

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleNextClick = () => {
    if (!amount) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter an amount.',
      });
      return;
    }
    // Reset step 2 form when opening
    setSenderName('');
    setSenderAccount('');
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
                            onChange={e => setAmount(e.target.value)}
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

                <div className="pt-4">
                  <Button
                      size="lg"
                      className="w-full h-12 text-lg rounded-full"
                      onClick={handleNextClick}
                      disabled={!amount}
                  >
                      Next
                  </Button>
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Complete Your Deposit</DialogTitle>
                  <DialogDescription>
                      After sending <span className="font-bold">{amount} PKR</span> to an admin account, fill in your payment details to submit your request.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                  
                  <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium text-center">Admin Accounts</h3>
                    {isLoadingWallets ? <p>Loading accounts...</p> : 
                      activeAdminWallets.map(wallet => (
                        <div key={wallet.id} className="text-sm rounded-md bg-muted/50 p-3">
                            <p className="font-bold">{wallet.walletName}</p>
                            <p>Name: {wallet.name}</p>
                            <p>Number: {wallet.number}</p>
                        </div>
                      ))
                    }
                  </div>

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
                  <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
