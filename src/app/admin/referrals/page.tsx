
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/data';
import { Separator } from '@/components/ui/separator';

export default function ReferralSettingsPage() {
  const [baseInvitationUrl, setBaseInvitationUrl] = React.useState('');
  const [commissionPercentage, setCommissionPercentage] = React.useState('');
  const [nonReferralBonus, setNonReferralBonus] = React.useState('');
  const [referralBonus, setReferralBonus] = React.useState('');
  const [giftOnDeposit, setGiftOnDeposit] = React.useState('');

  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading } = useDoc<AppSettings>(settingsRef);

  React.useEffect(() => {
    if (appSettings) {
      setBaseInvitationUrl(appSettings.baseInvitationUrl || '');
      setCommissionPercentage(String(appSettings.referralCommissionPercentage || ''));
      setNonReferralBonus(String(appSettings.nonReferralBonus || '200'));
      setReferralBonus(String(appSettings.referralBonus || '411'));
      setGiftOnDeposit(String(appSettings.giftOnDeposit || '0'));
    }
  }, [appSettings]);

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await setDoc(
        settingsRef,
        {
          baseInvitationUrl,
          referralCommissionPercentage: parseFloat(commissionPercentage) || 0,
          nonReferralBonus: parseFloat(nonReferralBonus) || 0,
          referralBonus: parseFloat(referralBonus) || 0,
          giftOnDeposit: parseFloat(giftOnDeposit) || 0,
        },
        { merge: true }
      );
      toast({
        title: 'Settings Saved',
        description: 'The referral and bonus settings have been updated successfully.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving',
        description: e.message || 'Could not save the settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Referral & Bonus Settings</h1>
        <p className="text-muted-foreground">Configure the user invitation, commission, and welcome bonus system.</p>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="max-w-2xl rounded-lg">
          <CardHeader>
            <CardTitle>Invitation & Commission</CardTitle>
            <CardDescription>
              Set the base URL for invitation links and the commission percentage for referrals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="base-url">Base Invitation URL</Label>
              <Input
                id="base-url"
                placeholder="e.g., https://yourapp.com/"
                value={baseInvitationUrl}
                onChange={(e) => setBaseInvitationUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This is the main URL for your app. The user's referral ID will be added to it automatically (e.g., ?ref=USER_ID).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission-percentage">Referral Commission on First Deposit (%)</Label>
              <Input
                id="commission-percentage"
                type="number"
                placeholder="e.g., 5"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                The percentage of a referred user's first deposit that goes to the referrer.
              </p>
            </div>
          </CardContent>

          <Separator className="my-6" />

          <CardHeader>
            <CardTitle>New User Welcome Bonus</CardTitle>
            <CardDescription>
              Set the automatic welcome bonus for new users when they register.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="non-referral-bonus">Welcome Bonus (No Referral)</Label>
              <Input
                id="non-referral-bonus"
                type="number"
                placeholder="e.g., 200"
                value={nonReferralBonus}
                onChange={(e) => setNonReferralBonus(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Amount a new user gets if they sign up without a referral code.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral-bonus">Welcome Bonus (With Referral)</Label>
              <Input
                id="referral-bonus"
                type="number"
                placeholder="e.g., 411"
                value={referralBonus}
                onChange={(e) => setReferralBonus(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Amount a new user gets if they sign up using a referral link.
              </p>
            </div>
          </CardContent>

          <Separator className="my-6" />

          <CardHeader>
            <CardTitle>Gift on Every Deposit</CardTitle>
            <CardDescription>
              Set a gift amount that users will receive on every deposit they make.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="gift-on-deposit">Gift Amount (PKR)</Label>
              <Input
                id="gift-on-deposit"
                type="number"
                placeholder="e.g., 50"
                value={giftOnDeposit}
                onChange={(e) => setGiftOnDeposit(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This amount will be added to the user's wallet as a gift on every successful deposit. Set to 0 to disable.
              </p>
            </div>
          </CardContent>

          <CardContent>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
