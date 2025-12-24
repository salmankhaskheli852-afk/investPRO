
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import type { AdminWallet, Transaction } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

const ConfirmPageComponent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    // Data from previous page
    const [amount, setAmount] = useState('');
    const [senderName, setSenderName] = useState('');
    const [senderAccount, setSenderAccount] = useState('');
    const [channelId, setChannelId] = useState('');
    
    // This page's state
    const [tid, setTid] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetching selected admin wallet
    const channelDocRef = useMemoFirebase(
      () => (firestore && channelId ? doc(firestore, 'admin_wallets', channelId) : null),
      [firestore, channelId]
    );
    const { data: selectedChannel, isLoading: isLoadingChannel } = useDoc<AdminWallet>(channelDocRef);

    useEffect(() => {
        const params = {
            amount: searchParams.get('amount'),
            senderName: searchParams.get('senderName'),
            senderAccount: searchParams.get('senderAccount'),
            channelId: searchParams.get('channelId'),
        };
        
        if (params.amount) setAmount(params.amount);
        if (params.senderName) setSenderName(params.senderName);
        if (params.senderAccount) setSenderAccount(params.senderAccount);
        if (params.channelId) setChannelId(params.channelId);

        if (!params.amount || !params.senderName || !params.senderAccount || !params.channelId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Deposit details are missing. Please start again.' });
            router.push('/user/deposit');
        }
    }, [searchParams, router, toast]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied!', description: `${label} has been copied to your clipboard.` });
    };

    const handleSubmitDeposit = async () => {
        if (!user || !firestore) return;
        if (!tid) {
            toast({ variant: 'destructive', title: 'TID Required', description: 'Please enter the transaction ID.' });
            return;
        }
        if (!selectedChannel) {
             toast({ variant: 'destructive', title: 'Error', description: 'Payment channel details not found.' });
            return;
        }

        setIsSubmitting(true);
        const amountToDeposit = parseFloat(amount);

        try {
            // Check for duplicate TID
            const duplicateCheckQuery = query(
                collection(firestore, 'transactions'),
                where('details.tid', '==', tid),
                where('status', '==', 'completed')
            );
            const duplicateSnapshot = await getDocs(duplicateCheckQuery);
            if (!duplicateSnapshot.empty) {
                toast({
                    variant: 'destructive',
                    title: 'Duplicate Transaction',
                    description: 'This Transaction ID has already been processed. Please check your deposit history or contact support.'
                });
                setIsSubmitting(false);
                return;
            }


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
                    userName: user.displayName,
                    userEmail: user.email,
                    adminWalletId: selectedChannel.id,
                    adminWalletName: selectedChannel.walletName,
                    senderName: senderName,
                    senderAccount: senderAccount,
                    tid: tid,
                }
            };
            batch.set(globalTransactionRef, { ...transactionData, id: globalTransactionRef.id });

            const userTransactionRef = doc(collection(firestore, `users/${user.uid}/wallets/main/transactions`), globalTransactionRef.id);
            batch.set(userTransactionRef, { ...transactionData, id: globalTransactionRef.id });

            await batch.commit();
            toast({
                title: 'Request Submitted!',
                description: 'Your deposit request has been submitted successfully.'
            });
            router.push('/user/history');

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="bg-white -m-4 sm:-m-6 lg:-m-8 min-h-screen flex flex-col">
             <header className="sticky top-0 z-10 h-20 w-full bg-blue-900 text-white flex items-center justify-center text-center">
                <span className="font-bold text-2xl tracking-widest">SAFE + FAST</span>
            </header>

            <main className="flex-1 p-4 space-y-5">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Warning (وارننگ)</span>
                    </div>
                    <p className="text-sm">Please pay with the same wallet and fill in the correct TID to avoid failure.</p>
                    <p className="text-sm font-arabic">براه کرم اسی بٹوے سے ادائیگی کریں اور ناکامی سے بچنے کے لیے درست TID بھریں۔</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <p className="font-semibold text-center text-gray-700">Please make payment to the account number below.</p>
                    <p className="font-semibold text-center text-gray-700 font-arabic">براہ کرم نیچے دیئے گئے اکاؤنٹ نمبر پر ادائیگی کریں۔</p>
                    
                    {isLoadingChannel ? (
                        <p>Loading account details...</p>
                    ) : selectedChannel ? (
                        <div className="space-y-2 text-lg">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-600">Wallet (پرس)</span>
                                <span className="font-bold text-gray-900">{selectedChannel.walletName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-600">Account (اکاؤنٹ)</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-600">{selectedChannel.number}</span>
                                    <Copy className="h-5 w-5 text-gray-500 cursor-pointer" onClick={() => handleCopy(selectedChannel.number, 'Account Number')} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-600">Quantity (مقدار)</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{parseFloat(amount).toLocaleString()}</span>
                                    <Copy className="h-5 w-5 text-gray-500 cursor-pointer" onClick={() => handleCopy(amount, 'Amount')} />
                                </div>
                            </div>
                        </div>
                    ) : <p className='text-center text-destructive'>Could not load payment details.</p>}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <p className="font-semibold text-gray-700">Fill in the correct TID. (درست TID پُر کریں۔)</p>
                    <Input 
                        value={tid}
                        onChange={(e) => setTid(e.target.value)}
                        placeholder="12-digit serial number (12 ہندسوں کا سیریل نمبر)"
                        className="h-12 text-base"
                    />
                </div>

                <div className="pt-4">
                     <Button 
                        className="w-full h-14 text-lg rounded-lg" 
                        onClick={handleSubmitDeposit}
                        disabled={isSubmitting || isLoadingChannel}
                    >
                        {isSubmitting ? 'Submitting...' : 'Confirm (تصدیق کریں)'}
                    </Button>
                </div>
            </main>
        </div>
    );
};


export default function ConfirmRechargePage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading Confirmation...</div>}>
            <ConfirmPageComponent />
        </Suspense>
    );
}
