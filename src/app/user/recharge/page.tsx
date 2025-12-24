
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RechargePageComponent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [amount, setAmount] = useState('');
    const [senderName, setSenderName] = useState('');
    const [senderAccount, setSenderAccount] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<AdminWallet | null>(null);

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
        
        if (amountParam) setAmount(amountParam);
        if (senderNameParam) setSenderName(senderNameParam);
        if (senderAccountParam) setSenderAccount(senderAccountParam);

        if (!amountParam || !senderNameParam || !senderAccountParam) {
            // If essential details are missing, redirect back
            toast({ variant: 'destructive', title: 'Error', description: 'Deposit details are missing. Please start again.' });
            router.push('/user/deposit');
        }
    }, [searchParams, router, toast]);

    const handleChannelChange = (walletId: string) => {
        const wallet = activeAdminWallets?.find(w => w.id === walletId);
        setSelectedChannel(wallet || null);
    }

    const handleProceedToConfirmation = () => {
        if (!selectedChannel) {
            toast({ variant: 'destructive', title: 'Please select a payment channel.' });
            return;
        }

        const queryParams = new URLSearchParams({
            amount,
            senderName,
            senderAccount,
            channelId: selectedChannel.id,
        });
        
        router.push(`/user/recharge/confirm?${queryParams.toString()}`);
    };
    
    return (
        <div className="bg-muted/30 -m-4 sm:-m-6 lg:-m-8 min-h-screen flex flex-col">
            <div className="sticky top-0 z-10 flex h-20 items-center justify-between bg-transparent px-4">
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/user/deposit">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                   <h1 className="text-xl font-bold text-foreground">Select Payment Channel</h1>
                </div>
            </div>

            <div className="flex-grow p-4 space-y-6">
                <div className="text-center space-y-2">
                    <p className="text-5xl font-bold text-foreground">Rs. {parseFloat(amount).toLocaleString()}</p>
                </div>
                
                <Card className="rounded-2xl shadow-lg border-none bg-card/80">
                    <CardHeader>
                        <CardTitle>Instructions (ہدایات)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p><b>Step 1:</b> The amount you need to pay is shown above.</p>
                        <p><b>Step 2:</b> Select the payment channel (like Easypaisa or JazzCash) from the dropdown menu.</p>
                        <p><b>Step 3:</b> Click the 'payment' button at the bottom to go to the final step, where you will see the account details for payment.</p>
                        <hr className="my-2"/>
                        <p className="font-arabic"><b>مرحلہ 1:</b> جو رقم آپ نے ادا کرنی ہے وہ اوپر دکھائی گئی ہے۔</p>
                        <p className="font-arabic"><b>مرحلہ 2:</b> ڈراپ ڈاؤن مینو سے ادائیگی کا چینل (جیسے ایزی پیسہ یا جاز کیش) منتخب کریں۔</p>
                        <p className="font-arabic"><b>مرحلہ 3:</b> آخری مرحلے پر جانے کے لیے نیچے 'payment' بٹن پر کلک کریں، جہاں آپ کو ادائیگی کے لیے اکاؤنٹ کی تفصیلات نظر آئیں گی۔</p>
                    </CardContent>
                </Card>

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
                </div>
            </div>
            
            <div className="p-4 sticky bottom-0 bg-muted/30">
                <Button 
                    className="w-full h-14 text-lg" 
                    onClick={handleProceedToConfirmation}
                    disabled={!selectedChannel}
                >
                    payment (ادائیگی)
                </Button>
            </div>
        </div>
    );
};

export default function RechargePage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <RechargePageComponent />
        </Suspense>
    );
}
