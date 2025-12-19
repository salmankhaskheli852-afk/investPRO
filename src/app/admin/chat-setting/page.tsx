
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

export default function ChatSettingPage() {
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [whatsappCommunityLink, setWhatsappCommunityLink] = React.useState('');
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
    }
  }, [appSettings]);

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await setDoc(settingsRef, { whatsappNumber, whatsappCommunityLink }, { merge: true });
      toast({
        title: 'Settings Saved',
        description: 'The chat settings have been updated successfully.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving',
        description: e.message || 'Could not save the chat settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">WhatsApp Chat Settings</h1>
        <p className="text-muted-foreground">Manage your customer support and community links.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Contact & Community</CardTitle>
          <CardDescription>
            Provide WhatsApp contact information for your users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
