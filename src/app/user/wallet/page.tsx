
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
import type { Wallet, Transaction, AdminWallet, WithdrawalMethod } from '@/lib/data';
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
import { collection, serverTimestamp, doc, writeBatch, addDoc, query, where, collectionGroup } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function UserWalletPage() {
  const [selectedWallet, setSelectedWallet] = React.useState('');
  const [showBankDetails, setShowBankDetails] = React.useState(false);
  const [depositAmount, setDepositAmount] = React.useState('');
  const [depositTid, setDepositTid] = React.useState('');
  const [depositHolderName, setDepositHolderName] = React.useState('');
  const [depositAccountNumber, setDepositAccountNumber] = React.useState('');
  
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawHolderName, setWithdrawHolderName] = React.useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = React.useState('');
  const [withdrawMethod, setWithdrawMethod] = React.useState('');
  const [bankName, setBankName] = React.useState('');

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
  
  const adminWalletsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'admin_wallets'), where('isEnabled', '==', true)) : null,
    [firestore]
  );
  const { data: adminWalletsData } = useCollection<AdminWallet>(adminWalletsQuery);

  const withdrawalMethodsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'withdrawal_methods'), where('isEnabled', '==', true)) : null,
    [firestore]
  );
  const { data: withdrawalMethodsData } = useCollection<WithdrawalMethod>(withdrawalMethodsQuery);

  React.useEffect(() => {
    if (adminWalletsData && adminWalletsData.length > 0 && !selectedWallet) {
      setSelectedWallet(adminWalletsData[0].id);
    }
  }, [adminWalletsData, selectedWallet]);

  React.useEffect(() => {
    if (withdrawalMethodsData && withdrawalMethodsData.length > 0 && !withdrawMethod) {
        const defaultMethod = withdrawalMethodsData.find(m => m.name.toLowerCase().includes('easypaisa')) || withdrawalMethodsData[0];
        setWithdrawMethod(defaultMethod.id);
    }
  }, [withdrawalMethodsData, withdrawMethod]);


  const handleDepositSubmit = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!depositAmount || !depositTid || !depositHolderName || !depositAccountNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill all deposit fields.' });
        return;
    }

    try {
        const globalTransactionsCollectionRef = collection(firestore, 'transactions');
        const userTransactionsCollectionRef = collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions');
        const newTransactionRef = doc(globalTransactionsCollectionRef);
        
        const transactionData = {
          id: newTransactionRef.id,
          type: 'deposit',
          amount: parseFloat(depositAmount),
          status: 'pending',
          date: serverTimestamp(),
          walletId: 'main',
          details: {
            tid: depositTid,
            senderName: depositHolderName,
            senderAccount: depositAccountNumber,
            adminWalletId: selectedWallet,
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
    if (!user || !firestore || !walletData) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!withdrawAmount || !withdrawHolderName || !withdrawAccountNumber) {
      setShowEmptyFields(true);
      return;
    }

    const amountToWithdraw = parseFloat(withdrawAmount);
    if (amountToWithdraw > walletData.balance) {
        setShowInsufficientFunds(true);
        return;
    }

    const userWalletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
    const transactionCollectionRef = collection(firestore, 'transactions');
    const userTransactionCollectionRef = collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions');

    try {
        const batch = writeBatch(firestore);

        const newTransactionRef = doc(transactionCollectionRef);
        const transactionData: Omit<Transaction, 'id' | 'date'> & { date: any } = {
          type: 'withdrawal',
          amount: amountToWithdraw,
          status: 'pending',
          date: serverTimestamp(),
          walletId: 'main',
          details: {
            method: withdrawalMethodsData?.find(m => m.id === withdrawMethod)?.name || 'Unknown',
            receiverName: withdrawHolderName,
            receiverAccount: withdrawAccountNumber,
            bankName: showBankDetails ? bankName : undefined,
            userId: user.uid,
            userName: user.displayName,
            userEmail: user.email,
          }
        };
        batch.set(newTransactionRef, { ...transactionData, id: newTransactionRef.id });

        const userNewTransactionRef = doc(userTransactionCollectionRef, newTransactionRef.id);
        batch.set(userNewTransactionRef, { ...transactionData, id: newTransactionRef.id });
        
        const newBalance = walletData.balance - amountToWithdraw;
        batch.update(userWalletRef, { balance: newBalance });

        await batch.commit();

        toast({ title: 'Success', description: 'Your withdrawal request has been submitted.' });
        
        setWithdrawAmount('');
        setWithdrawHolderName('');
        setWithdrawAccountNumber('');
        setBankName('');
        setIsWithdrawDialogOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Failed to submit withdrawal request." });
    }
  };

  const selectedWalletDetails = adminWalletsData?.find(w => w.id === selectedWallet);

  React.useEffect(() => {
    const selectedMethod = withdrawalMethodsData?.find(m => m.id === withdrawMethod);
    setShowBankDetails(selectedMethod?.name.toLowerCase().includes('bank') || false);
  }, [withdrawMethod, withdrawalMethodsData]);

  return (
    <>
      <AlertDialog open={showInsufficientFunds} onOpenChange={setShowInsufficientFunds}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Funds</AlertDialogTitle>
            <AlertDialogDescription>
              You do not have enough balance to withdraw this amount.
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Deposit Funds</DialogTitle>
                        <DialogDescription>
                          Send funds to an account below and enter the details to verify.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                          <Label>Select Admin Account</Label>
                          <RadioGroup value={selectedWallet} onValueChange={setSelectedWallet}>
                              {adminWalletsData?.map((wallet) => (
                                  <Label key={wallet.id} htmlFor={wallet.id} className="flex items-center space-x-3 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                      <RadioGroupItem value={wallet.id} id={wallet.id} />
                                      {wallet.isBank ? <Landmark className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                                      <span className="font-medium">{wallet.walletName}</span>
                                  </Label>
                              ))}
                          </RadioGroup>

                          {selectedWalletDetails && (
                              <Card className="bg-muted/50">
                                  <CardHeader>
                                      <CardTitle className="text-base">Account Details</CardTitle>
                                  </CardHeader>
                                  <CardContent className="text-sm space-y-2">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">{selectedWalletDetails.isBank ? 'Bank Name:' : 'Wallet Service:'}</span>
                                          <span className="font-medium">{selectedWalletDetails.name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Account Holder:</span>
                                          <span className="font-medium">{selectedWalletDetails.walletName}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">{selectedWalletDetails.isBank ? 'Account Number:' : 'Wallet Number:'}</span>
                                          <span className="font-medium">{selectedWalletDetails.number}</span>
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
                          >
                              <ArrowUpFromLine className="mr-2 h-4 w-4" />
                              Withdraw
                          </Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Withdraw Funds</DialogTitle>
                              <DialogDescription>
                                  Select your withdrawal method and enter your details. Your balance is {walletData?.balance.toLocaleString() || 0} PKR.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                              <div className="space-y-2">
                                  <Label>Select Method</Label>
                                  <RadioGroup onValueChange={setWithdrawMethod} value={withdrawMethod} className="grid grid-cols-2 gap-2">
                                      {withdrawalMethodsData?.map((method) => (
                                         <Label key={method.id} htmlFor={method.id} className="flex items-center space-x-2 cursor-pointer rounded-md border p-3 [&:has([data-state=checked])]:border-primary">
                                          <RadioGroupItem value={method.id} id={method.id} />
                                          <span>{method.name}</span>
                                      </Label>
                                      ))}
                                  </RadioGroup>
                              </div>

                              {showBankDetails && (
                                  <div className="space-y-2">
                                      <Label htmlFor="bank-name">Bank Name</Label>
                                      <Select value={bankName} onValueChange={setBankName}>
                                          <SelectTrigger id="bank-name">
                                              <SelectValue placeholder="Select a bank" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="Meezan Bank">Meezan Bank</SelectItem>
                                              <SelectItem value="Habib Bank Limited (HBL)">Habib Bank Limited (HBL)</SelectItem>
                                              <SelectItem value="United Bank Limited (UBL)">United Bank Limited (UBL)</SelectItem>
                                              <SelectItem value="National Bank of Pakistan (NBP)">National Bank of Pakistan (NBP)</SelectItem>
                                              <SelectItem value="Allied Bank Limited (ABL)">Allied Bank Limited (ABL)</SelectItem>
                                              <SelectItem value="MCB Bank Limited">MCB Bank Limited</SelectItem>
                                              <SelectItem value="Bank Alfalah">Bank Alfalah</SelectItem>
                                              <SelectItem value="Faysal Bank">Faysal Bank</SelectItem>
                                              <SelectItem value="Askari Bank">Askari Bank</SelectItem>
                                              <SelectItem value="Bank Al-Habib">Bank Al-Habib</SelectItem>
                                              <SelectItem value="JS Bank">JS Bank</SelectItem>
                                              <SelectItem value="Soneri Bank">Soneri Bank</SelectItem>
                                              <SelectItem value="Summit Bank">Summit Bank</SelectItem>
                                              <SelectItem value="The Bank of Punjab">The Bank of Punjab</SelectItem>
                                              <SelectItem value="Standard Chartered Bank">Standard Chartered Bank</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              )}

                              <div className="space-y-2">
                                  <Label htmlFor="withdraw-account-holder">Account Holder Name</Label>
                                  <Input id="withdraw-account-holder" placeholder="Your Name" value={withdrawHolderName} onChange={e => setWithdrawHolderName(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="withdraw-account-number">{showBankDetails ? 'Account Number / IBAN' : 'Account Number'}</Label>
                                  <Input id="withdraw-account-number" placeholder={showBankDetails ? 'PK...' : '03...'} value={withdrawAccountNumber} onChange={e => setWithdrawAccountNumber(e.target.value)} />
                              </div>
                              <div className="space-y-2">
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
