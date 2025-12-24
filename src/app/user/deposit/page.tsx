
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';

export default function DepositPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [amount, setAmount] = React.useState('');
  const [selectedMethod, setSelectedMethod] = React.useState('');

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading } = useDoc<AppSettings>(settingsRef);

  const presetAmounts = appSettings?.rechargePresetAmounts || [];
  const rechargeMethods = appSettings?.rechargeMethods || [];
  
  React.useEffect(() => {
    if (!amount && presetAmounts.length > 0) {
      setAmount(String(presetAmounts[0]));
    }
    if (!selectedMethod && rechargeMethods.length > 0) {
      setSelectedMethod(rechargeMethods[0]);
    }
  }, [presetAmounts, rechargeMethods, amount, selectedMethod]);


  const handleAmountClick = (value: number) => {
    setAmount(String(value));
  };
  
  const handleRecharge = () => {
      toast({
          title: 'Recharge Initiated',
          description: `Proceeding with a recharge of ${amount} Rs via ${selectedMethod}.`
      })
      // In a real scenario, you would redirect to a payment gateway here.
  }

  return (
    <div className="bg-[#eaf4ff] -m-4 sm:-m-6 lg:-m-8 min-h-screen">
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
        <Card className="rounded-2xl shadow-lg border-none bg-white/70">
            <CardContent className="p-6 space-y-8">
                <div>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-primary">Rs</span>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-14 rounded-lg border-2 border-primary/50 bg-white text-2xl font-bold pl-12 focus-visible:ring-primary"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-medium text-muted-foreground">Choose Amount</h3>
                    {isLoading ? <p>Loading options...</p> : (
                      <div className="grid grid-cols-3 gap-3">
                          {presetAmounts.map((preset) => (
                              <Button 
                                  key={preset}
                                  variant={String(preset) === amount ? 'default' : 'outline'}
                                  className={cn("h-11 text-base", String(preset) !== amount && "bg-white border-primary/30 text-primary hover:bg-primary/10 hover:text-primary")}
                                  onClick={() => handleAmountClick(preset)}
                              >
                                  {preset.toLocaleString()} Rs
                              </Button>
                          ))}
                      </div>
                    )}
                </div>

                 <div className="space-y-4">
                    <h3 className="font-medium text-muted-foreground">Recharge Method</h3>
                     {isLoading ? <p>Loading methods...</p> : (
                        <div className="grid grid-cols-1 gap-3">
                           {rechargeMethods.map((method) => (
                                <Button
                                    key={method}
                                    variant={selectedMethod === method ? 'default' : 'outline'}
                                    className={cn("h-14 text-lg", selectedMethod !== method && "bg-white border-primary/30 text-primary hover:bg-primary/10 hover:text-primary")}
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
                        className="w-full h-14 text-xl rounded-full bg-gray-300 hover:bg-gray-400 text-gray-600 shadow-none"
                        onClick={handleRecharge}
                        disabled // The button in the screenshot looks disabled
                     >
                        Recharge
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
