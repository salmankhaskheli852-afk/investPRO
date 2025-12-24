
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

export default function DepositPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [step, setStep] = React.useState(1);
  const [selectedAdminWallet, setSelectedAdminWallet] = React.useState<AdminWallet | null>(null);
  
  // Form state
  const [amount, setAmount] = React.useState('');
  const [senderName, setSenderName] = React.useState('');
  const [senderAccount, setSenderAccount] = React.useState('');
  const [tid, setTid] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  const adminWalletsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'admin_wallets') : null),
    [firestore]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

  const enabledWallets = React.useMemo(() => {
    return adminWallets?.filter(w => w.isEnabled) || [];
  }, [adminWallets]);

  const handleWalletSelect = (wallet: AdminWallet) => {
    setSelectedAdminWallet(wallet);
    setStep(2);
  };
  
  const handleSubmitRequest = async () => {
    if (!user || !firestore || !selectedAdminWallet) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid deposit amount.'});
        return;
    }

    if (appSettings?.minDeposit && depositAmount < appSettings.minDeposit) {
        toast({ variant: 'destructive', title: 'Amount Too Low', description: `Minimum deposit is ${appSettings.minDeposit} PKR.`});
        return;
    }
    if (appSettings?.maxDeposit && depositAmount > appSettings.maxDeposit) {
        toast({ variant: 'destructive', title: 'Amount Too High', description: `Maximum deposit is ${appSettings.maxDeposit} PKR.`});
        return;
    }
    
    if (!senderName || !senderAccount || !tid) {
        toast({ variant: 'destructive', title: 'Missing Details', description: 'Please fill out all sender details.'});
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        const batch = writeBatch(firestore);

        const newTransactionRef = doc(collection(firestore, 'transactions'));
        const userTransactionRef = doc(collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'), newTransactionRef.id);
        
        const transactionData: Omit<Transaction, 'id' | 'date'> & { date: any } = {
            type: 'deposit',
            amount: depositAmount,
            status: 'pending',
            date: serverTimestamp(),
            walletId: 'main',
            details: {
                userId: user.uid,
                userName: user.displayName,
                userEmail: user.email,
                adminWalletId: selectedAdminWallet.id,
                adminWalletName: selectedAdminWallet.walletName,
                senderName: senderName,
                senderAccount: senderAccount,
                tid: tid,
            }
        };

        batch.set(newTransactionRef, { ...transactionData, id: newTransactionRef.id });
        batch.set(userTransactionRef, { ...transactionData, id: newTransactionRef.id });

        await batch.commit();

        toast({ title: 'Request Submitted!', description: 'Your deposit request has been submitted for review.'});
        setStep(3); // Go to success step

    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }

  };

  const resetForm = () => {
    setAmount('');
    setSenderName('');
    setSenderAccount('');
    setTid('');
    setSelectedAdminWallet(null);
    setStep(1);
  }

  return (
    <div className="bg-muted/30 -m-4 sm:-m-6 lg:-m-8 min-h-screen">
       <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-transparent px-4">
        <div className="flex items-center gap-2">
            {step === 1 ? (
                 <Button asChild variant="ghost" size="icon">
                    <Link href="/user">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
            ) : (
                <Button variant="ghost" size="icon" onClick={() => setStep(prev => prev - 1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}
           <h1 className="text-xl font-bold text-foreground">Deposit</h1>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Step 1: Select Admin Account */}
        {step === 1 && (
            <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">Step 1: Choose an Account</h2>
                        <p className="text-sm text-muted-foreground">Select an account below to send your payment to.</p>
                    </div>
                    {isLoadingWallets && <p>Loading accounts...</p>}
                    <div className="space-y-3">
                        {enabledWallets.map(wallet => (
                            <button 
                                key={wallet.id}
                                onClick={() => handleWalletSelect(wallet)}
                                className="w-full text-left p-4 rounded-lg border bg-background hover:bg-muted transition-colors"
                            >
                                <p className="font-bold text-primary">{wallet.walletName}</p>
                                <p className="text-sm font-medium">{wallet.name}</p>
                                <p className="text-sm text-muted-foreground">{wallet.number}</p>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        {/* Step 2: Submit Details */}
        {step === 2 && selectedAdminWallet && (
            <>
            <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6 space-y-4">
                     <div>
                        <h2 className="text-lg font-semibold">Step 2: Confirm Your Payment</h2>
                        <p className="text-sm text-muted-foreground">
                            You are sending payment to the following account. After payment, fill in your details below.
                        </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                        <p className="font-bold text-green-700">{selectedAdminWallet.walletName}</p>
                        <p className="text-sm font-medium text-green-800">{selectedAdminWallet.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedAdminWallet.number}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border-none">
                 <CardContent className="p-6 space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Your Wallet Details</h3>
                        <p className="text-sm text-muted-foreground">Please provide your payment details accurately.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="amount">Deposit Amount (PKR)</Label>
                            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 5000" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="sender-name">Your Name</Label>
                            <Input id="sender-name" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g., John Doe" />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="sender-account">Your Wallet/Account Number</Label>
                            <Input id="sender-account" value={senderAccount} onChange={e => setSenderAccount(e.target.value)} placeholder="e.g., 03001234567" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="tid">Transaction ID (TID)</Label>
                            <Input id="tid" value={tid} onChange={e => setTid(e.target.value)} placeholder="Enter the transaction ID from your payment app" />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            size="lg"
                            className="w-full h-12 text-lg"
                            onClick={handleSubmitRequest}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Request"}
                        </Button>
                    </div>
                 </CardContent>
            </Card>
            </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
            <Card className="rounded-2xl shadow-lg border-none">
                 <CardContent className="p-8 text-center space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <h2 className="text-2xl font-bold">Request Submitted!</h2>
                    <p className="text-muted-foreground">
                        Your deposit request has been sent for verification. The amount will be added to your wallet upon approval.
                    </p>
                    <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/user/history">View History</Link>
                        </Button>
                        <Button className="w-full" onClick={resetForm}>
                            Make Another Deposit
                        </Button>
                    </div>
                 </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}

    