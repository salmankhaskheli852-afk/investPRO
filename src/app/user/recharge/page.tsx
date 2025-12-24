
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { AdminWallet, Transaction } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Banknote, Landmark, Copy, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RechargePageComponent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [amount, setAmount] = useState('');
    const [orderNo, setOrderNo] = useState('');
    const [senderName, setSenderName] = useState('');
    const [senderAccount, setSenderAccount] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<AdminWallet | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

    const adminWalletsQuery = useMemoFirebase(
      () => (firestore ? collection(firestore, 'admin_wallets') : null),
      [firestore]
    );
    const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);

    const activeAdminWallets = React.useMemo(() => adminWallets?.filter(w => w.isEnabled), [adminWallets]);

    useEffect(() => {
        const amountParam = searchParams.get('amount');
        const senderNameParam = searchParams.get('senderName');
        const senderAccountParam = searchParams.get('senderAccount');
        
        if (amountParam) {
            setAmount(amountParam);
            const timestamp = Date.now();
            const randomSuffix = Math.floor(Math.random() * 10000);
            setOrderNo(`S${timestamp}${randomSuffix}`);
        } else {
            router.push('/user/deposit');
        }
        if (senderNameParam) setSenderName(senderNameParam);
        if (senderAccountParam) setSenderAccount(senderAccountParam);

    }, [searchParams, router]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied!',
            description: `${label} has been copied to your clipboard.`,
        });
    };
    
    const handleChannelChange = (walletId: string) => {
        const wallet = activeAdminWallets?.find(w => w.id === walletId);
        setSelectedChannel(wallet || null);
    }

    const handleSubmitDeposit = async () => {
        if (!user || !firestore) return;
        if (!selectedChannel) {
            toast({ variant: 'destructive', title: 'Please select a payment channel.' });
            return;
        }

        setIsSubmitting(true);
        const amountToDeposit = parseFloat(amount);
        const tid = `TID-${orderNo}`;

        try {
            const batch = writeBatch(firestore);

            const globalTransactionRef = doc(collection(firestore, 'transactions'));
            const transactionData: Omit<Transaction, 'id'| 'date'> & { date: any } = {
                type: 'deposit',
                amount: amountToDeposit,
                status: 'pending',
                date: serverTimestamp(),
                walletId: 'main',
                details: {
                    userId: user.uid,
                    userName: senderName,
                    userEmail: user.email,
                    adminWalletId: selectedChannel.id,
                    adminWalletName: selectedChannel.name,
                    senderName: senderName,
                    senderAccount: senderAccount,
                    tid: tid,
                }
            };
            batch.set(globalTransactionRef, { ...transactionData, id: globalTransactionRef.id });

            const userTransactionRef = doc(collection(firestore, `users/${user.uid}/wallets/main/transactions`), globalTransactionRef.id);
            batch.set(userTransactionRef, { ...transactionData, id: globalTransactionRef.id });

            await batch.commit();
            setIsPaymentConfirmed(true);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <>
        <AlertDialog open={isPaymentConfirmed}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex justify-center">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <AlertDialogTitle className="text-center">Request Submitted!</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Your deposit request for <strong>{amount} PKR</strong> has been submitted. It will be reviewed by our team shortly. You can check the status in your history.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.push('/user/history')} className="w-full">
                        Go to History
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


        <div className="bg-muted/30 -m-4 sm:-m-6 lg:-m-8 min-h-screen flex flex-col">
            <div className="sticky top-0 z-10 flex h-20 items-center justify-between bg-transparent px-4">
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/user/deposit">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                   <h1 className="text-xl font-bold text-foreground">Confirm Payment</h1>
                </div>
            </div>

            <div className="flex-grow p-4 space-y-6">
                <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Order No: {orderNo}</p>
                    <p className="text-5xl font-bold text-foreground">Rs. {parseFloat(amount).toLocaleString()}</p>
                </div>

                <div className="space-y-3">
                    <h3 className="text-md font-semibold text-muted-foreground">Payment channel (ادائیگی کا چینل)</h3>
                    
                    <Select onValueChange={handleChannelChange}>
                      <SelectTrigger className="w-full h-12 text-base">
                        <SelectValue placeholder="Select a payment channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingWallets ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          activeAdminWallets?.map(wallet => (
                            <SelectItem key={wallet.id} value={wallet.id}>{wallet.walletName}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    {selectedChannel && (
                        <div className="mt-4 pt-4 border-t space-y-2 text-sm bg-background p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Account Name</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{selectedChannel.name}</span>
                                    <Copy className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => handleCopy(selectedChannel.name, 'Account Name')} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Account Number</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{selectedChannel.number}</span>
                                    <Copy className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => handleCopy(selectedChannel.number, 'Account Number')} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-4 rounded-lg">
                    <h4 className="font-bold text-sm text-foreground mb-2">Kind tips:</h4>
                    <p>1. Choose which bank name to obtain a bank account, and funds must be transferred to the corresponding bank name and bank account;</p>
                    <p className="font-arabic">۱. منتخب کریں کہ کس بینک کا نام بینک اکاؤنٹ حاصل کرنا ہے، اور فنڈز کو متعلقہ بینک کے نام اور بینک اکاؤنٹ میں منتقل کیا جانا چاہیے؛</p>
                    <p>2. The same phone number can be bound to multiple bank accounts. Do not transfer funds to another bank account of your choice;</p>
                     <p className="font-arabic">۲. ایک ہی فون نمبر کو متعدد بینک اکاؤنٹس کا پابند کیا جا سکتا ہے۔ اپنی پسند کے دوسرے بینک اکاؤنٹ میں رقوم منتقل نہ کریں۔</p>
                    <p className="font-bold text-destructive">*Important reminder: If funds are transferred to another bank with the same phone number, the funds may not be credited to your account.</p>
                     <p className="font-bold font-arabic text-destructive">*اہم یاد دہانی: اگر فنڈز اسی فون نمبر کے ساتھ کسی دوسرے بینک میں منتقل کیے جائیں تو یہ رقم آپ کے اکاؤنٹ میں جمع نہیں ہو سکتی۔</p>
                </div>
            </div>
            
            <div className="p-4 sticky bottom-0 bg-muted/30">
                <Button 
                    className="w-full h-14 text-lg" 
                    onClick={handleSubmitDeposit}
                    disabled={!selectedChannel || isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'payment (ادائیگی)'}
                </Button>
            </div>
        </div>
        </>
    );
};

export default function RechargePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RechargePageComponent />
        </Suspense>
    );
}
