
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import type { Wallet, Transaction, AdminWallet, AppSettings, User, WithdrawalMethod } from '@/lib/data';
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Landmark } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


export default function UserWalletPage() {
  const [selectedAdminWallet, setSelectedAdminWallet] = React.useState('');
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = React.useState('');
  const [depositTid, setDepositTid] = React.useState('');
  const [depositHolderName, setDepositHolderName] = React.useState('');
  const [depositAccountNumber, setDepositAccountNumber] = React.useState('');
  
  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawMethod, setWithdrawMethod] = React.useState('');
  const [withdrawHolderName, setWithdrawHolderName] = React.useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = React.useState('');
  const [withdrawBankName, setWithdrawBankName] = React.useState('');


  const [isDepositDialogOpen, setIsDepositDialogOpen] = React.useState(false);
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
  
  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'admin_wallets'), where('isEnabled', '==', true)) : null),
    [firestore, user]
  );
  const { data: adminWalletsData } = useCollection<AdminWallet>(adminWalletsQuery);

  const withdrawalMethodsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'withdrawal_methods'), where('isEnabled', '==', true)) : null),
    [firestore, user]
  );
  const { data: withdrawalMethods } = useCollection<WithdrawalMethod>(withdrawalMethodsQuery);
  

  const isWithdrawalDisabled = appSettings?.isVerificationEnabled && !userData?.isVerified;

  React.useEffect(() => {
    if (adminWalletsData && adminWalletsData.length > 0 && !selectedAdminWallet) {
      setSelectedAdminWallet(adminWalletsData[0].id);
    }
  }, [adminWalletsData, selectedAdminWallet]);

  const handleDepositSubmit = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!depositAmount || !depositTid || !depositHolderName || !depositAccountNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill all deposit fields.' });
        return;
    }
    
    const amount = parseFloat(depositAmount);
    if (appSettings?.minDeposit && amount < appSettings.minDeposit) {
      toast({ variant: 'destructive', title: 'Deposit amount too low', description: `Minimum deposit is ${appSettings.minDeposit} PKR.` });
      return;
    }
    if (appSettings?.maxDeposit && amount > appSettings.maxDeposit) {
      toast({ variant: 'destructive', title: 'Deposit amount too high', description: `Maximum deposit is ${appSettings.maxDeposit} PKR.` });
      return;
    }

    try {
        // Check for duplicate TID
        const existingTxQuery = query(collection(firestore, 'transactions'), where('details.tid', '==', depositTid));
        const existingTxSnapshot = await getDocs(existingTxQuery);
        if (!existingTxSnapshot.empty) {
            toast({ variant: 'destructive', title: 'Duplicate Transaction', description: 'This Transaction ID has already been used. Please check and try again.' });
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
        setIsDepositDialogOpen(false);
        router.push('/user/history');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Failed to submit deposit request." });
    }
  };
  
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

    if (amountToWithdraw > (walletData.earningBalance || 0)) {
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

            const currentEarningBalance = walletDoc.data().earningBalance || 0;
            if (amountToWithdraw > currentEarningBalance) {
                throw new Error("Insufficient earning balance.");
            }

            // 1. Create global transaction record
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

            // 2. Create user-specific transaction record
            const userNewTransactionRef = doc(collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'), newTransactionRef.id);
            transaction.set(userNewTransactionRef, { ...transactionData, id: newTransactionRef.id });
            
            // 3. Update the wallet's earningBalance
            const newEarningBalance = currentEarningBalance - amountToWithdraw;
            transaction.update(userWalletRef, { earningBalance: newEarningBalance });
        });

        toast({ title: 'Success', description: 'Your withdrawal request has been submitted.' });
        
        // Reset form
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

  const selectedAdminWalletDetails = adminWalletsData?.find(w => w.id === selectedAdminWallet);

  return (
    <>
      <AlertDialog open={showInsufficientFunds} onOpenChange={setShowInsufficientFunds}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Earning Balance</AlertDialogTitle>
            <AlertDialogDescription>
              You do not have enough balance in your earnings to withdraw this amount.
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
          <p className="text-muted-foreground">Manage your funds, deposit, and withdraw.</p>
        </div>
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
              <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-2 gap-4">
                  <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                          size="lg"
                          variant='outline'
                      >
                          <ArrowDownToLine className="mr-2 h-4 w-4" />
                          Deposit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Deposit Funds</DialogTitle>
                        <DialogDescription>
                          Send funds to an account below and enter the details to verify.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                          <Label>Select Admin Account</Label>
                          <RadioGroup value={selectedAdminWallet} onValueChange={setSelectedAdminWallet}>
                              {adminWalletsData?.map((wallet) => (
                                  <Label key={wallet.id} htmlFor={wallet.id} className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                      <RadioGroupItem value={wallet.id} id={wallet.id} />
                                      {wallet.isBank ? <Landmark className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                                      <span className="font-medium">{wallet.walletName}</span>
                                  </Label>
                              ))}
                          </RadioGroup>

                          {selectedAdminWalletDetails && (
                              <Card className="bg-muted/50">
                                  <CardHeader>
                                      <CardTitle className="text-base">Account Details</CardTitle>
                                  </CardHeader>
                                  <CardContent className="text-sm space-y-2">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">{selectedAdminWalletDetails.isBank ? 'Bank Name:' : 'Wallet Service:'}</span>
                                          <span className="font-medium">{selectedAdminWalletDetails.name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Account Holder:</span>
                                          <span className="font-medium">{selectedAdminWalletDetails.walletName}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">{selectedAdminWalletDetails.isBank ? 'Account Number:' : 'Wallet Number:'}</span>
                                          <span className="font-medium">{selectedAdminWalletDetails.number}</span>
                                      </div>
                                  </CardContent>
                              </Card>
                          )}
                          
                          <div className="space-y-2 pt-4">
                              <Label htmlFor="account-holder-name">Your Account Holder Name</Label>
                              <Input id="account-holder-name" placeholder="Your Name" value={depositHolderName} onChange={e => setDepositHolderName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="account-number">Your Account Number</Label>
                              <Input id="account-number" placeholder="03xxxxxxxx" value={depositAccountNumber} onChange={e => setDepositAccountNumber(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="amount">Amount (PKR)</Label>
                              <Input id="amount" type="number" placeholder="500" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="tid">Transaction ID (TID)</Label>
                              <Input id="tid" placeholder="e.g., 1234567890" value={depositTid} onChange={e => setDepositTid(e.target.value)} />
                          </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit" className="bg-primary hover:bg-primary/90" onClick={handleDepositSubmit}>Submit Request</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

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
                                  Enter your account details and amount. Your withdrawable balance is {(walletData?.earningBalance || 0).toLocaleString()} PKR.
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
      </div>
    </>
  );
}

    