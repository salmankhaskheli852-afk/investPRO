
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
import { useRouter } from 'next/navigation';

export default function DepositPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  
  const [amount, setAmount] = React.useState('');
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  const handlePresetAmountClick = (presetAmount: number) => {
    setAmount(String(presetAmount));
  };
  
  React.useEffect(() => {
    // Select the first method by default
    if (appSettings?.rechargeMethods && appSettings.rechargeMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(appSettings.rechargeMethods[0]);
    }
  }, [appSettings, selectedMethod]);

  const handleRecharge = () => {
    // Navigate to the new blank page without checking for amount or method
    router.push('/user/recharge');
  };

  return (
    <div className="bg-muted/30 -m-4 sm:-m-6 lg:-m-8 min-h-screen">
       <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-transparent px-4">
        <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
                <Link href="/user">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </Button>
           <h1 className="text-xl font-bold text-foreground">Recharge</h1>
        </div>
      </div>
      
      <div className="p-4">
        <Card className="rounded-2xl shadow-lg border-none bg-card/80">
            <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="amount" className="sr-only">Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">Rs</span>
                        <input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0"
                            className="h-14 w-full border-b-2 border-primary bg-transparent pl-12 text-2xl font-bold focus:outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Choose Amount</h3>
                    {isLoadingSettings ? (
                        <p>Loading presets...</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                           {appSettings?.rechargePresetAmounts?.sort((a,b) => a-b).map(preset => (
                                <Button 
                                    key={preset}
                                    variant={String(preset) === amount ? 'default' : 'outline'}
                                    onClick={() => handlePresetAmountClick(preset)}
                                >
                                    {preset.toLocaleString()} Rs
                                </Button>
                           ))}
                        </div>
                    )}
                </div>

                 <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Recharge Method</h3>
                    {isLoadingSettings ? (
                        <p>Loading methods...</p>
                    ) : (
                        <div className="space-y-3">
                           {appSettings?.rechargeMethods?.map(method => (
                                <Button 
                                    key={method}
                                    variant={selectedMethod === method ? 'default' : 'outline'}
                                    className="w-full justify-center text-base"
                                    onClick={() => setSelectedMethod(method)}
                                >
                                    {method}
                                </Button>
                           ))}
                        </div>
                    )}
                </div>

                <div className="pt-4">
                    <Button
                        size="lg"
                        className="w-full h-12 text-lg rounded-full"
                        onClick={handleRecharge}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Processing..." : "Recharge"}
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
