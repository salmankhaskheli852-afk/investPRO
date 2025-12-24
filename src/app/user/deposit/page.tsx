
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
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  // Step 2 state
  const [selectedAdminWalletId, setSelectedAdminWalletId] = React.useState<string>('');
  const [senderName, setSenderName] = React.useState('');
  const [senderAccount, setSenderAccount] = React.useState('');
  const [tid, setTid] = React.useState('');
  
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
  
  React.useEffect(() => {
    if (appSettings?.rechargeMethods && appSettings.rechargeMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(appSettings.rechargeMethods[0]);
    }
  }, [appSettings, selectedMethod]);

  const handleSubmitRequest = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    if (!amount || !selectedAdminWalletId || !senderName || !senderAccount || !tid) {
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
                adminWalletId: selectedAdminWalletId,
                senderName,
                senderAccount,
                tid,
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
    if (!amount || !selectedMethod) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter an amount and select a method.',
      });
      return;
    }
    // Reset step 2 form when opening
    setSelectedAdminWalletId('');
    setSenderName('');
    setSenderAccount('');
    setTid('');
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

                 <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Recharge Method</h3>
                    {isLoadingSettings ? (
                        <p>Loading methods...</p>
                    ) : (
                        <div className="space-y-3">
                           {appSettings?.rechargeMethods?.map(method => (
                                <Button 
                                    key={method}
                                    variant={selectedMethod === method ? 'default' : 'outline'}
                                    className="w-full justify-center text-base"
                                    onClick={() => setSelectedMethod(method)}
                                >
                                    {method}
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
                      disabled={!amount || !selectedMethod}
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
                      After sending <span className="font-bold">{amount} PKR</span> to one of the accounts below, fill in your payment details to submit your request.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="space-y-2">
                      <Label htmlFor="admin-wallet">Select Admin Account</Label>
                      <Select value={selectedAdminWalletId} onValueChange={setSelectedAdminWalletId}>
                          <SelectTrigger id="admin-wallet">
                              <SelectValue placeholder="Select account to deposit to" />
                          </SelectTrigger>
                          <SelectContent>
                              {isLoadingWallets ? (
                                  <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                              ) : (
                                  activeAdminWallets.map(wallet => (
                                      <SelectItem key={wallet.id} value={wallet.id}>
                                          {wallet.walletName} - {wallet.name} ({wallet.number})
                                      </SelectItem>
                                  ))
                              )}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="sender-name">Your Name (Sender)</Label>
                      <Input id="sender-name" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g., John Doe" />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="sender-account">Your Account Number (Sender)</Label>
                      <Input id="sender-account" value={senderAccount} onChange={e => setSenderAccount(e.target.value)} placeholder="e.g., 03001234567" />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="tid">Transaction ID (TID)</Label>
                      <Input id="tid" value={tid} onChange={e => setTid(e.target.value)} placeholder="Enter the transaction ID from your app" />
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
