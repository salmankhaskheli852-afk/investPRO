
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

export default function ReferralSettingsPage() {
  const [baseInvitationUrl, setBaseInvitationUrl] = React.useState('');
  const [commissionPercentage, setCommissionPercentage] = React.useState('');
  
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
    }
  }, [appSettings]);

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await setDoc(settingsRef, { 
        baseInvitationUrl,
        referralCommissionPercentage: parseFloat(commissionPercentage) || 0,
      }, { merge: true });
      toast({
        title: 'Settings Saved',
        description: 'The referral settings have been updated successfully.',
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
        <h1 className="text-3xl font-bold font-headline">Referral Settings</h1>
        <p className="text-muted-foreground">Configure the user invitation and referral commission system.</p>
      </div>

      <Card className="max-w-2xl">
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
                This is the main URL for your app. The user's referral ID will be added to it (e.g., ?ref=USER_ID).
             </p>
          </div>
           <div className="space-y-2">
            <Label htmlFor="commission-percentage">Referral Commission (%)</Label>
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
          
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
