
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function AppSettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [whatsappCommunityLink, setWhatsappCommunityLink] = React.useState('');
  const [verificationBadgeText, setVerificationBadgeText] = React.useState('');
  const [minDeposit, setMinDeposit] = React.useState('');
  const [maxDeposit, setMaxDeposit] = React.useState('');
  const [minWithdrawal, setMinWithdrawal] = React.useState('');
  const [maxWithdrawal, setMaxWithdrawal] = React.useState('');
  const [userMaintenanceMode, setUserMaintenanceMode] = React.useState(false);
  const [userMaintenanceMessage, setUserMaintenanceMessage] = React.useState('');
  const [agentMaintenanceMode, setAgentMaintenanceMode] = React.useState(false);
  const [agentMaintenanceMessage, setAgentMaintenanceMessage] = React.useState('');
  
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
      setWhatsappNumber(appSettings.whatsappNumber || '');
      setWhatsappCommunityLink(appSettings.whatsappCommunityLink || '');
      setVerificationBadgeText(appSettings.verificationBadgeText || 'Verified by Gov');
      setMinDeposit(String(appSettings.minDeposit || ''));
      setMaxDeposit(String(appSettings.maxDeposit || ''));
      setMinWithdrawal(String(appSettings.minWithdrawal || ''));
      setMaxWithdrawal(String(appSettings.maxWithdrawal || ''));
      setUserMaintenanceMode(appSettings.userMaintenanceMode || false);
      setUserMaintenanceMessage(appSettings.userMaintenanceMessage || 'The user panel is currently under maintenance. We will be back shortly.');
      setAgentMaintenanceMode(appSettings.agentMaintenanceMode || false);
      setAgentMaintenanceMessage(appSettings.agentMaintenanceMessage || 'The agent panel is currently under maintenance. We will be back shortly.');
    }
  }, [appSettings]);

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await setDoc(settingsRef, { 
        whatsappNumber, 
        whatsappCommunityLink, 
        verificationBadgeText,
        minDeposit: parseFloat(minDeposit) || 0,
        maxDeposit: parseFloat(maxDeposit) || 0,
        minWithdrawal: parseFloat(minWithdrawal) || 0,
        maxWithdrawal: parseFloat(maxWithdrawal) || 0,
        userMaintenanceMode,
        userMaintenanceMessage,
        agentMaintenanceMode,
        agentMaintenanceMessage,
      }, { merge: true });
      toast({
        title: 'Settings Saved',
        description: 'The app settings have been updated successfully.',
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
        <h1 className="text-3xl font-bold font-headline">App Settings</h1>
        <p className="text-muted-foreground">Manage your customer support links and other app-wide settings.</p>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Provide general information and set transaction limits for your users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="badge-text">Header Verification Badge Text</Label>
            <Input
              id="badge-text"
              placeholder="e.g., Verified by Gov"
              value={verificationBadgeText}
              onChange={(e) => setVerificationBadgeText(e.target.value)}
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">
                This text appears in the header next to a green shield icon.
             </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">WhatsApp Support Number</Label>
            <Input
              id="whatsapp-number"
              placeholder="+923001234567"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">
                Enter the number including the country code (e.g., +92 for Pakistan).
             </p>
          </div>
           <div className="space-y-2">
            <Label htmlFor="whatsapp-community-link">WhatsApp Community Link</Label>
            <Input
              id="whatsapp-community-link"
              placeholder="https://chat.whatsapp.com/YourCommunityID"
              value={whatsappCommunityLink}
              onChange={(e) => setWhatsappCommunityLink(e.target.value)}
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">
                Provide the full invitation link for your WhatsApp community group.
             </p>
          </div>

          <Separator />

          <div>
             <h3 className="text-lg font-medium mb-4">Transaction Limits</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="min-deposit">Minimum Deposit (PKR)</Label>
                    <Input id="min-deposit" type="number" placeholder="e.g., 500" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max-deposit">Maximum Deposit (PKR)</Label>
                    <Input id="max-deposit" type="number" placeholder="e.g., 100000" value={maxDeposit} onChange={(e) => setMaxDeposit(e.target.value)} disabled={isLoading} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="min-withdrawal">Minimum Withdrawal (PKR)</Label>
                    <Input id="min-withdrawal" type="number" placeholder="e.g., 1000" value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} disabled={isLoading} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="max-withdrawal">Maximum Withdrawal (PKR)</Label>
                    <Input id="max-withdrawal" type="number" placeholder="e.g., 50000" value={maxWithdrawal} onChange={(e) => setMaxWithdrawal(e.target.value)} disabled={isLoading} />
                </div>
             </div>
          </div>

           <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Maintenance Mode</h3>
              <div className="space-y-6">
                  <div className="flex flex-col space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="user-maintenance-mode" className="font-medium">User Panel Maintenance</Label>
                          <Switch
                              id="user-maintenance-mode"
                              checked={userMaintenanceMode}
                              onCheckedChange={setUserMaintenanceMode}
                              disabled={isLoading}
                          />
                      </div>
                       <p className="text-sm text-muted-foreground">
                          If enabled, all users will see a maintenance page instead of their dashboard.
                      </p>
                      {userMaintenanceMode && (
                        <div className="space-y-2 pt-2">
                          <Label htmlFor="user-maintenance-message">User Maintenance Message</Label>
                          <Textarea
                            id="user-maintenance-message"
                            value={userMaintenanceMessage}
                            onChange={(e) => setUserMaintenanceMessage(e.target.value)}
                            placeholder="The user panel is under maintenance..."
                          />
                        </div>
                      )}
                  </div>

                   <div className="flex flex-col space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="agent-maintenance-mode" className="font-medium">Agent Panel Maintenance</Label>
                          <Switch
                              id="agent-maintenance-mode"
                              checked={agentMaintenanceMode}
                              onCheckedChange={setAgentMaintenanceMode}
                              disabled={isLoading}
                          />
                      </div>
                       <p className="text-sm text-muted-foreground">
                          If enabled, all agents will see a maintenance page instead of their dashboard.
                      </p>
                      {agentMaintenanceMode && (
                        <div className="space-y-2 pt-2">
                          <Label htmlFor="agent-maintenance-message">Agent Maintenance Message</Label>
                          <Textarea
                            id="agent-maintenance-message"
                            value={agentMaintenanceMessage}
                            onChange={(e) => setAgentMaintenanceMessage(e.target.value)}
                            placeholder="The agent panel is under maintenance..."
                          />
                        </div>
                      )}
                  </div>
              </div>
            </div>
          
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
