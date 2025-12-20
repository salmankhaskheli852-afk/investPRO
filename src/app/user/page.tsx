
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import type { User, AdminWallet, Transaction, AppSettings } from '@/lib/data';
import { doc, serverTimestamp, updateDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Bell, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  CalendarCheck, 
  Crown, 
  Gift, 
  Dice5, 
  ScrollText,
  Landmark,
  Banknote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';

const ServiceButton = ({ icon, label, href }: { icon: React.ElementType, label: string, href: string }) => {
  const Icon = icon;
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-white shadow-md hover:bg-gray-50 transition-colors">
      <Icon className="h-8 w-8 text-primary" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
};

const FeatureCard = ({ icon, label, href, className }: { icon: React.ElementType, label: string, href: string, className?: string }) => {
    const Icon = icon;
    return (
         <Link href={href} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg shadow-md hover:opacity-90 transition-opacity text-white ${className}`}>
            <Icon className="h-8 w-8" />
            <span className="font-bold">{label}</span>
        </Link>
    )
}

export default function UserHomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isDepositDialogOpen, setIsDepositDialogOpen] = React.useState(false);
  const [selectedAdminWallet, setSelectedAdminWallet] = React.useState('');
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = React.useState('');
  const [depositTid, setDepositTid] = React.useState('');
  const [depositHolderName, setDepositHolderName] = React.useState('');
  const [depositAccountNumber, setDepositAccountNumber] = React.useState('');

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const adminWalletsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'admin_wallets'), where('isEnabled', '==', true)) : null),
    [firestore, user]
  );
  const { data: adminWalletsData } = useCollection<AdminWallet>(adminWalletsQuery);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

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

  const selectedAdminWalletDetails = adminWalletsData?.find(w => w.id === selectedAdminWallet);

  return (
    <>
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-xl overflow-hidden p-6 flex items-center justify-center bg-gradient-to-r from-green-300 to-blue-200">
        <Image src="/logo.svg" alt="SPF Logo" width={100} height={100} className="opacity-80" />
        <span className="text-5xl font-extrabold text-white opacity-90 ml-4">SPF</span>
      </div>

      {/* Wallet Section */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <Link href="/user/wallet" className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Wallet</span>
          </Link>
          <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
            <div className="grid grid-cols-2 gap-4">
              <DialogTrigger asChild>
                <div className="flex flex-col items-center p-2 rounded-lg bg-red-100 text-red-800 cursor-pointer">
                    <ArrowDownToLine className="h-6 w-6" />
                    <span className="text-xs font-bold">RECHARGE</span>
                </div>
              </DialogTrigger>
              <Link href="/user/wallet">
                <div className="flex flex-col items-center p-2 rounded-lg bg-green-100 text-green-800">
                  <ArrowUpFromLine className="h-6 w-6" />
                  <span className="text-xs font-bold">WITHDRAW</span>
                </div>
              </Link>
            </div>
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
        </CardContent>
      </Card>
      
      {/* Service Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">Service</h2>
        <div className="grid grid-cols-3 gap-4">
          <ServiceButton icon={Users} label="Refer Friends" href="/user/invitation" />
          <ServiceButton icon={CalendarCheck} label="Daily check-in" href="/user/history" />
          <ServiceButton icon={Crown} label="VIP Agent" href="#" />
        </div>
      </div>
      
       {/* Feature Cards Section */}
       <div className="grid grid-cols-3 gap-4">
            <FeatureCard icon={Gift} label="My Gift" href="#" className="bg-gradient-to-r from-blue-400 to-blue-500" />
            <FeatureCard icon={Dice5} label="Lucky Draw" href="#" className="bg-gradient-to-r from-purple-400 to-purple-500" />
            <FeatureCard icon={ScrollText} label="Task reward" href="#" className="bg-gradient-to-r from-orange-400 to-orange-500" />
       </div>
       
        {/* Profit Model Section */}
        <div>
            <h2 className="text-xl font-bold mb-4">Profit Model</h2>
            <Card>
                <CardContent className="p-4">
                    <p className="text-muted-foreground">Details about the profit model will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    </div>
    </>
  );
}

    