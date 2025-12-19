'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { adminWallets } from '@/lib/data';
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Landmark } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

export default function UserWalletPage() {
  const [selectedWallet, setSelectedWallet] = React.useState(adminWallets.find(w => !w.isBank)?.id || '');
  const [showBankDetails, setShowBankDetails] = React.useState(false);
  const [depositAmount, setDepositAmount] = React.useState('');
  const [depositTid, setDepositTid] = React.useState('');
  const [depositHolderName, setDepositHolderName] = React.useState('');
  const [depositAccountNumber, setDepositAccountNumber] = React.useState('');
  
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawHolderName, setWithdrawHolderName] = React.useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = React.useState('');
  const [withdrawMethod, setWithdrawMethod] = React.useState('jazzcash');


  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const handleDepositSubmit = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!depositAmount || !depositTid || !depositHolderName || !depositAccountNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill all deposit fields.' });
        return;
    }

    const transactionRef = collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions');
    addDocumentNonBlocking(transactionRef, {
      type: 'deposit',
      amount: parseFloat(depositAmount),
      status: 'pending',
      date: serverTimestamp(),
      details: {
        tid: depositTid,
        senderName: depositHolderName,
        senderAccount: depositAccountNumber,
        adminWalletId: selectedWallet
      }
    });

    toast({ title: 'Success', description: 'Your deposit request has been submitted.' });
  };

  const handleWithdrawalSubmit = async () => {
     if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!withdrawAmount || !withdrawHolderName || !withdrawAccountNumber) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill all withdrawal fields.' });
        return;
    }

    const transactionRef = collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions');
    addDocumentNonBlocking(transactionRef, {
      type: 'withdrawal',
      amount: parseFloat(withdrawAmount),
      status: 'pending',
      date: serverTimestamp(),
      details: {
        method: withdrawMethod,
        receiverName: withdrawHolderName,
        receiverAccount: withdrawAccountNumber,
      }
    });

    toast({ title: 'Success', description: 'Your withdrawal request has been submitted.' });
  };


  // Mock states for withdrawal method toggles from admin
  const [jazzcashEnabled, setJazzcashEnabled] = React.useState(true);
  const [easypaisaEnabled, setEasypaisaEnabled] = React.useState(true);
  const [bankEnabled, setBankEnabled] = React.useState(true);


  const selectedWalletDetails = adminWallets.find(w => w.id === selectedWallet);

  const handleWithdrawalMethodChange = (value: string) => {
    setWithdrawMethod(value);
    setShowBankDetails(value === 'bank');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
        <p className="text-muted-foreground">Manage your funds, deposit, and withdraw.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4">
                <Dialog>
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
                    <div className="grid gap-4 py-4">
                        <Label>Select Admin Account</Label>
                        <RadioGroup value={selectedWallet} onValueChange={setSelectedWallet}>
                            {adminWallets.map((wallet) => (
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
                                        <span className="text-muted-foreground">{selectedWalletDetails.isBank ? 'Bank Name:' : 'Account Name:'}</span>
                                        <span className="font-medium">{selectedWalletDetails.isBank ? selectedWalletDetails.walletName : selectedWalletDetails.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{selectedWalletDetails.isBank ? 'Account Holder:' : 'Account Name:'}</span>
                                        <span className="font-medium">{selectedWalletDetails.name}</span>
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
                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" onClick={handleDepositSubmit}>Submit Request</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button 
                            size="lg"
                            variant='outline'
                        >
                            <ArrowUpFromLine className="mr-2 h-4 w-4" />
                            Withdraw
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Withdraw Funds</DialogTitle>
                            <DialogDescription>
                                Select your withdrawal method and enter your details.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Select Method</Label>
                                <RadioGroup onValueChange={handleWithdrawalMethodChange} value={withdrawMethod} className="flex">
                                    {jazzcashEnabled && <Label htmlFor="jazzcash" className="flex items-center space-x-2 cursor-pointer">
                                        <RadioGroupItem value="jazzcash" id="jazzcash" />
                                        <span>JazzCash</span>
                                    </Label>}
                                    {easypaisaEnabled && <Label htmlFor="easypaisa" className="flex items-center space-x-2 cursor-pointer">
                                        <RadioGroupItem value="easypaisa" id="easypaisa" />
                                        <span>Easypaisa</span>
                                    </Label>}
                                    {bankEnabled && <Label htmlFor="bank" className="flex items-center space-x-2 cursor-pointer">
                                        <RadioGroupItem value="bank" id="bank" />
                                        <span>Bank</span>
                                    </Label>}
                                </RadioGroup>
                            </div>

                            {showBankDetails ? (
                                <div className="space-y-2">
                                    <Label htmlFor="bank-name">Bank Name</Label>
                                    <Select>
                                        <SelectTrigger id="bank-name">
                                            <SelectValue placeholder="Select a bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="meezan">Meezan Bank</SelectItem>
                                            <SelectItem value="hbl">Habib Bank Limited (HBL)</SelectItem>
                                            <SelectItem value="ubl">United Bank Limited (UBL)</SelectItem>
                                            <SelectItem value="nbp">National Bank of Pakistan (NBP)</SelectItem>
                                            <SelectItem value="abl">Allied Bank Limited (ABL)</SelectItem>
                                            <SelectItem value="mcb">MCB Bank Limited</SelectItem>
                                            <SelectItem value="alfalah">Bank Alfalah</SelectItem>
                                            <SelectItem value="faysal">Faysal Bank</SelectItem>
                                            <SelectItem value="askari">Askari Bank</SelectItem>
                                            <SelectItem value="alhabib">Bank Al-Habib</SelectItem>
                                            <SelectItem value="js">JS Bank</SelectItem>
                                            <SelectItem value="soneri">Soneri Bank</SelectItem>
                                            <SelectItem value="summit">Summit Bank</SelectItem>
                                            <SelectItem value="bop">The Bank of Punjab</SelectItem>
                                            <SelectItem value="sc">Standard Chartered Bank</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

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
                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" onClick={handleWithdrawalSubmit}>Submit Request</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
