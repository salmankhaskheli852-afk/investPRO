
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { AppSettings } from '@/lib/data';
import { Trash2, PlusCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function RechargeSettingsPage() {
  const [newPresetAmount, setNewPresetAmount] = React.useState('');
  const [newRechargeMethod, setNewRechargeMethod] = React.useState('');

  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const settingsRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore, user]
  );
  const { data: appSettings, isLoading, forceRefetch } = useDoc<AppSettings>(settingsRef);

  const handleAddAmount = async () => {
    if (!newPresetAmount || !settingsRef) return;
    const amount = parseInt(newPresetAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount' });
      return;
    }
    await updateDoc(settingsRef, {
      rechargePresetAmounts: arrayUnion(amount)
    });
    toast({ title: 'Amount Added' });
    setNewPresetAmount('');
  };

  const handleRemoveAmount = async (amount: number) => {
    if (!settingsRef) return;
    await updateDoc(settingsRef, {
      rechargePresetAmounts: arrayRemove(amount)
    });
    toast({ title: 'Amount Removed' });
  };

  const handleAddMethod = async () => {
    if (!newRechargeMethod || !settingsRef) return;
    await updateDoc(settingsRef, {
      rechargeMethods: arrayUnion(newRechargeMethod)
    });
    toast({ title: 'Method Added' });
    setNewRechargeMethod('');
  };

  const handleRemoveMethod = async (method: string) => {
    if (!settingsRef) return;
    await updateDoc(settingsRef, {
      rechargeMethods: arrayRemove(method)
    });
    toast({ title: 'Method Removed' });
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Recharge Settings</h1>
        <p className="text-muted-foreground">Manage the options available on the user recharge page.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preset Amounts Card */}
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Preset Amounts</CardTitle>
            <CardDescription>
              Set the quick-select amounts for user recharges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="new-amount">New Preset Amount (PKR)</Label>
              <div className="flex gap-2">
                <Input
                  id="new-amount"
                  type="number"
                  placeholder="e.g., 5000"
                  value={newPresetAmount}
                  onChange={(e) => setNewPresetAmount(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={handleAddAmount} disabled={isLoading || !newPresetAmount}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Current Amounts</h4>
                {isLoading ? <p>Loading...</p> : (
                    <div className="flex flex-wrap gap-2">
                        {appSettings?.rechargePresetAmounts?.length === 0 && <p className='text-sm text-muted-foreground'>No preset amounts added.</p>}
                        {appSettings?.rechargePresetAmounts?.sort((a,b) => a-b).map(amount => (
                            <div key={amount} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                                <span className="font-medium text-secondary-foreground">{amount.toLocaleString()} Rs</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleRemoveAmount(amount)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Recharge Methods Card */}
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recharge Methods</CardTitle>
            <CardDescription>
              Manage the payment gateways or methods shown to users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
              <Label htmlFor="new-method">New Recharge Method</Label>
              <div className="flex gap-2">
                <Input
                  id="new-method"
                  placeholder="e.g., BitPay"
                  value={newRechargeMethod}
                  onChange={(e) => setNewRechargeMethod(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={handleAddMethod} disabled={isLoading || !newRechargeMethod}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Current Methods</h4>
                 {isLoading ? <p>Loading...</p> : (
                    <div className="flex flex-wrap gap-2">
                         {appSettings?.rechargeMethods?.length === 0 && <p className='text-sm text-muted-foreground'>No recharge methods added.</p>}
                        {appSettings?.rechargeMethods?.map(method => (
                             <div key={method} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                                <span className="font-medium text-secondary-foreground">{method}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleRemoveMethod(method)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
