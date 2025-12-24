
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, writeBatch, getDocs, serverTimestamp } from 'firebase/firestore';
import type { AdminWallet, AppSettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Landmark, Banknote, Copy } from 'lucide-react';

export default function DepositPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedAdminWallet, setSelectedAdminWallet] = React.useState('');
  const [depositAmount, setDepositAmount] = React.useState('');
  const [depositTid, setDepositTid] = React.useState('');
  const [depositHolderName, setDepositHolderName] = React.useState('');
  const [depositAccountNumber, setDepositAccountNumber] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'admin_wallets'), where('isEnabled', '==', true)) : null),
    [firestore, user]
  );
  const { data: adminWalletsData } = useCollection<AdminWallet>(adminWalletsQuery);

  const settingsRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore, user]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  React.useEffect(() => {
    if (adminWalletsData && adminWalletsData.length > 0 && !selectedAdminWallet) {
      setSelectedAdminWallet(adminWalletsData[0].id);
    }
  }, [adminWalletsData, selectedAdminWallet]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'The account number has been copied to your clipboard.',
    });
  };

  const handleDepositSubmit = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!depositAmount || !depositTid || !depositHolderName || !depositAccountNumber || !selectedAdminWallet) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill all deposit fields.' });
        return;
    }
    
    setIsSubmitting(true);
    const amount = parseFloat(depositAmount);
    if (appSettings?.minDeposit && amount < appSettings.minDeposit) {
      toast({ variant: 'destructive', title: 'Deposit amount too low', description: `Minimum deposit is ${appSettings.minDeposit} PKR.` });
      setIsSubmitting(false);
      return;
    }
    if (appSettings?.maxDeposit && amount > appSettings.maxDeposit) {
      toast({ variant: 'destructive', title: 'Deposit amount too high', description: `Maximum deposit is ${appSettings.maxDeposit} PKR.` });
      setIsSubmitting(false);
      return;
    }

    try {
        const existingTxQuery = query(collection(firestore, 'transactions'), where('details.tid', '==', depositTid));
        const existingTxSnapshot = await getDocs(existingTxQuery);
        if (!existingTxSnapshot.empty) {
            toast({ variant: 'destructive', title: 'Duplicate Transaction', description: 'This Transaction ID has already been used. Please check and try again.' });
            setIsSubmitting(false);
            return;
        }

        const globalTransactionsCollectionRef = collection(firestore, 'transactions');
        const userTransactionsCollectionRef = collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions');
        const newTransactionRef = doc(globalTransactionsCollectionRef);
        
        const transactionData = {
          id: newTransactionRef.id,
          type: 'deposit' as const,
          amount: parseFloat(depositAmount),
          status: 'pending' as const,
          date: serverTimestamp(),
          walletId: 'main',
          details: {
            tid: depositTid,
            senderName: depositHolderName,
            senderAccount: depositAccountNumber,
            adminWalletId: selectedAdminWallet,
            userId: user.uid,
          }
        };

        const batch = writeBatch(firestore);
        batch.set(newTransactionRef, transactionData);

        const userTransactionRef = doc(userTransactionsCollectionRef, newTransactionRef.id);
        batch.set(userTransactionRef, transactionData);

        await batch.commit();

        toast({ title: 'Success', description: 'Your deposit request has been submitted.' });
        router.push('/user/history');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Failed to submit deposit request." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAdminWalletDetails = adminWalletsData?.find(w => w.id === selectedAdminWallet);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Deposit Funds</h1>
        <p className="text-muted-foreground">Send funds to an account below and enter the details to verify.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select an Account to Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedAdminWallet} onValueChange={setSelectedAdminWallet} className="grid grid-cols-1 gap-4">
              {adminWalletsData?.map((wallet) => (
                  <Label key={wallet.id} htmlFor={wallet.id} className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                      <RadioGroupItem value={wallet.id} id={wallet.id} />
                      {wallet.isBank ? <Landmark className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                      <span className="font-medium">{wallet.walletName}</span>
                  </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {selectedAdminWalletDetails && (
          <Card className="bg-muted/50">
              <CardHeader>
                  <CardTitle className="text-base">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Holder:</span>
                      <span className="font-medium">{selectedAdminWalletDetails.walletName}</span>
                  </div>
                   <div className="flex justify-between">
                      <span className="text-muted-foreground">{selectedAdminWalletDetails.isBank ? 'Bank Name:' : 'Wallet Service:'}</span>
                      <span className="font-medium">{selectedAdminWalletDetails.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{selectedAdminWalletDetails.isBank ? 'Account Number:' : 'Wallet Number:'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedAdminWalletDetails.number}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(selectedAdminWalletDetails.number)}>
                            <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                  </div>
              </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Step 2: Enter Your Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="account-holder-name">Your Account Holder Name</Label>
                    <Input id="account-holder-name" placeholder="e.g., Ali Khan" value={depositHolderName} onChange={e => setDepositHolderName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account-number">Your Account Number</Label>
                    <Input id="account-number" placeholder="The account number you sent from" value={depositAccountNumber} onChange={e => setDepositAccountNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount Sent (PKR)</Label>
                    <Input id="amount" type="number" placeholder="e.g., 5000" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tid">Transaction ID (TID)</Label>
                    <Input id="tid" placeholder="From your payment receipt" value={depositTid} onChange={e => setDepositTid(e.target.value)} />
                </div>
                 <Button type="submit" className="w-full bg-primary hover:bg-primary/90" onClick={handleDepositSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Deposit?</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm text-muted-foreground">
            <ol className="list-decimal pl-5 space-y-2">
                <li>Select one of the admin accounts from the list above.</li>
                <li>Copy the account details and send the desired amount using your bank or wallet app (Easypaisa/Jazzcash).</li>
                <li>After sending the payment, take a screenshot and note down the Transaction ID (TID).</li>
                <li>Fill out the form above with your payment details (your name, your account number, the amount you sent, and the TID).</li>
                <li>Click "Submit Request". Your deposit will be reviewed and approved by an agent shortly.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
