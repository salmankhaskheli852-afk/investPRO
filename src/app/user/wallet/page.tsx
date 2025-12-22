
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import type { Wallet, Transaction, AppSettings, User, WithdrawalMethod } from '@/lib/data';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch, query, where, runTransaction, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


export default function UserWalletPage() {
  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawMethod, setWithdrawMethod] = React.useState('');
  const [withdrawHolderName, setWithdrawHolderName] = React.useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = React.useState('');
  const [withdrawBankName, setWithdrawBankName] = React.useState('');

  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = React.useState(false);

  const [showInsufficientFunds, setShowInsufficientFunds] = React.useState(false);
  const [showEmptyFields, setShowEmptyFields] = React.useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const walletRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid, 'wallets', 'main') : null),
    [firestore, user]
  );
  const { data: walletData } = useDoc<Wallet>(walletRef);

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);
  
  const withdrawalMethodsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'withdrawal_methods'), where('isEnabled', '==', true)) : null),
    [firestore, user]
  );
  const { data: withdrawalMethods } = useCollection<WithdrawalMethod>(withdrawalMethodsQuery);
  

  const isWithdrawalDisabled = appSettings?.isVerificationEnabled && !userData?.isVerified;
  
  const handleWithdrawalSubmit = async () => {
    if (isWithdrawalDisabled) {
       toast({ variant: 'destructive', title: 'Action Denied', description: 'Your account must be verified to make withdrawals.' });
       return;
    }
    if (!user || !firestore || !walletData) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!withdrawAmount || !withdrawMethod || !withdrawHolderName || !withdrawAccountNumber || (withdrawMethod === 'Bank Transfer' && !withdrawBankName)) {
      setShowEmptyFields(true);
      return;
    }

    const amountToWithdraw = parseFloat(withdrawAmount);

    if (appSettings?.minWithdrawal && amountToWithdraw < appSettings.minWithdrawal) {
      toast({ variant: 'destructive', title: 'Withdrawal amount too low', description: `Minimum withdrawal is ${appSettings.minWithdrawal} PKR.` });
      return;
    }
    if (appSettings?.maxWithdrawal && amountToWithdraw > appSettings.maxWithdrawal) {
      toast({ variant: 'destructive', title: 'Withdrawal amount too high', description: `Maximum withdrawal is ${appSettings.maxWithdrawal} PKR.` });
      return;
    }

    if (amountToWithdraw > (walletData.balance || 0)) {
        setShowInsufficientFunds(true);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const userWalletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
            const walletDoc = await transaction.get(userWalletRef);

            if (!walletDoc.exists()) {
                throw new Error("Wallet not found.");
            }

            const currentBalance = walletDoc.data().balance || 0;
            if (amountToWithdraw > currentBalance) {
                throw new Error("Insufficient balance.");
            }

            const newTransactionRef = doc(collection(firestore, 'transactions'));
            const transactionData: Omit<Transaction, 'id' | 'date'> & { date: any } = {
                type: 'withdrawal',
                amount: amountToWithdraw,
                status: 'pending',
                date: serverTimestamp(),
                walletId: 'main',
                details: {
                    method: withdrawMethod,
                    receiverName: withdrawHolderName,
                    receiverAccount: withdrawAccountNumber,
                    bankName: withdrawMethod === 'Bank Transfer' ? withdrawBankName : undefined,
                    userId: user.uid,
                    userName: user.displayName,
                    userEmail: user.email,
                }
            };
            transaction.set(newTransactionRef, { ...transactionData, id: newTransactionRef.id });

            const userNewTransactionRef = doc(collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'), newTransactionRef.id);
            transaction.set(userNewTransactionRef, { ...transactionData, id: newTransactionRef.id });
            
            // Deduct from balance
            transaction.update(userWalletRef, { balance: increment(-amountToWithdraw) });
        });

        toast({ title: 'Success', description: 'Your withdrawal request has been submitted.' });
        
        setWithdrawAmount('');
        setWithdrawMethod('');
        setWithdrawHolderName('');
        setWithdrawAccountNumber('');
        setWithdrawBankName('');
        setIsWithdrawDialogOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Failed to submit withdrawal request." });
    }
  };


  return (
    <>
      <AlertDialog open={showInsufficientFunds} onOpenChange={setShowInsufficientFunds}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Balance</AlertDialogTitle>
            <AlertDialogDescription>
              You do not have enough balance in your wallet to withdraw this amount.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowInsufficientFunds(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showEmptyFields} onOpenChange={setShowEmptyFields}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Missing Information</AlertDialogTitle>
            <AlertDialogDescription>
              Please fill out all the required fields for the withdrawal request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowEmptyFields(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
          <p className="text-muted-foreground">Manage your funds and withdraw.</p>
        </div>
        <Card className="max-w-md mx-auto rounded-lg">
          <CardHeader className="text-center">
              <CardTitle>Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 gap-4">
                  <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                      <DialogTrigger asChild>
                          <Button 
                              size="lg"
                              variant='outline'
                              disabled={isWithdrawalDisabled}
                              title={isWithdrawalDisabled ? 'Your account must be verified to withdraw' : 'Withdraw funds'}
                          >
                              <ArrowUpFromLine className="mr-2 h-4 w-4" />
                              Withdraw
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                          <DialogHeader>
                              <DialogTitle>Withdraw Funds</DialogTitle>
                              <DialogDescription>
                                  Enter your account details and amount. Your available balance is {(walletData?.balance || 0).toLocaleString()} PKR.
                              </DialogDescription>
                          </DialogHeader>
                          
                           <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                <div className="space-y-2">
                                  <Label htmlFor="withdraw-method">Your Wallet Name</Label>
                                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                                    <SelectTrigger id="withdraw-method">
                                      <SelectValue placeholder="Select a method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {withdrawalMethods?.map(method => (
                                        <SelectItem key={method.id} value={method.name}>
                                          {method.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {withdrawMethod === 'Bank Transfer' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="bank-name">Bank Name</Label>
                                        <Select value={withdrawBankName} onValueChange={setWithdrawBankName}>
                                            <SelectTrigger id="bank-name">
                                                <SelectValue placeholder="Select a bank" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Al Baraka Bank">Al Baraka Bank</SelectItem>
                                                <SelectItem value="Allied Bank Limited (ABL)">Allied Bank Limited (ABL)</SelectItem>
                                                <SelectItem value="Askari Bank">Askari Bank</SelectItem>
                                                <SelectItem value="Bank Alfalah">Bank Alfalah</SelectItem>
                                                <SelectItem value="Bank Al-Habib">Bank Al-Habib</SelectItem>
                                                <SelectItem value="BankIslami Pakistan">BankIslami Pakistan</SelectItem>
                                                <SelectItem value="Bank of Punjab (BOP)">Bank of Punjab (BOP)</SelectItem>
                                                <SelectItem value="Dubai Islamic Bank">Dubai Islamic Bank</SelectItem>
                                                <SelectItem value="Faysal Bank">Faysal Bank</SelectItem>
                                                <SelectItem value="FINCA Microfinance Bank">FINCA Microfinance Bank</SelectItem>
                                                <SelectItem value="First Women Bank">First Women Bank</SelectItem>
                                                <SelectItem value="Habib Bank Limited (HBL)">Habib Bank Limited (HBL)</SelectItem>
                                                <SelectItem value="Habib Metropolitan Bank">Habib Metropolitan Bank</SelectItem>
                                                <SelectItem value="JS Bank">JS Bank</SelectItem>
                                                <SelectItem value="Khushhali Microfinance Bank">Khushhali Microfinance Bank</SelectItem>
                                                <SelectItem value="MCB Bank Limited">MCB Bank Limited</SelectItem>
                                                <SelectItem value="MCB Islamic Bank">MCB Islamic Bank</SelectItem>
                                                <SelectItem value="Meezan Bank">Meezan Bank</SelectItem>
                                                <SelectItem value="Mobilink Microfinance Bank (JazzCash)">Mobilink Microfinance Bank (JazzCash)</SelectItem>
                                                <SelectItem value="National Bank of Pakistan (NBP)">National Bank of Pakistan (NBP)</SelectItem>
                                                <SelectItem value="NayaPay">NayaPay</SelectItem>
                                                <SelectItem value="SadaPay">SadaPay</SelectItem>
                                                <SelectItem value="Samba Bank">Samba Bank</SelectItem>
                                                <SelectItem value="Silkbank">Silkbank</SelectItem>
                                                <SelectItem value="Sindh Bank">Sindh Bank</SelectItem>
                                                <SelectItem value="Soneri Bank">Soneri Bank</SelectItem>
                                                <SelectItem value="Standard Chartered Bank">Standard Chartered Bank</SelectItem>
                                                <SelectItem value="Summit Bank">Summit Bank</SelectItem>
                                                <SelectItem value="Telenor Microfinance Bank (Easypaisa)">Telenor Microfinance Bank (Easypaisa)</SelectItem>
                                                <SelectItem value="U Microfinance Bank">U Microfinance Bank</SelectItem>
                                                <SelectItem value="United Bank Limited (UBL)">United Bank Limited (UBL)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="withdraw-account-holder">Account Holder Name</Label>
                                    <Input id="withdraw-account-holder" type="text" placeholder="Your Name" value={withdrawHolderName} onChange={e => setWithdrawHolderName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="withdraw-account-number">{withdrawMethod === 'Bank Transfer' ? 'Account Number / IBAN' : 'Account Number'}</Label>
                                    <Input id="withdraw-account-number" placeholder={withdrawMethod === 'Bank Transfer' ? 'PK...' : '03...'} value={withdrawAccountNumber} onChange={e => setWithdrawAccountNumber(e.target.value)} />
                                </div>
                                
                                <div className="space-y-2 pt-4">
                                    <Label htmlFor="withdraw-amount">Amount to Withdraw (PKR)</Label>
                                    <Input id="withdraw-amount" type="number" placeholder="1000" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                                </div>
                            </div>

                          <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit" className="bg-primary hover:bg-primary/90" onClick={handleWithdrawalSubmit}>Submit Request</Button>
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
              </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    