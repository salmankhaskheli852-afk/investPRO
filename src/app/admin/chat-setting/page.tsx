
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';

type ChatSettings = {
  whatsappNumber?: string;
  isChatEnabled?: boolean; // This can be deprecated but kept for safety
};

export default function ChatSettingPage() {
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'chat_settings') : null),
    [firestore]
  );
  const { data: chatSettings, isLoading } = useDoc<ChatSettings>(settingsRef);

  React.useEffect(() => {
    if (chatSettings) {
      setWhatsappNumber(chatSettings.whatsappNumber || '');
    }
  }, [chatSettings]);

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      // Only save the WhatsApp number now
      await setDoc(settingsRef, { whatsappNumber }, { merge: true });
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
        <h1 className="text-3xl font-bold font-headline">Chat Settings</h1>
        <p className="text-muted-foreground">Manage your customer support chat options.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Backup Support Channel</CardTitle>
          <CardDescription>
            Provide a WhatsApp number for users to contact if live chat is unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">WhatsApp Support Number</Label>
            <Input
              id="whatsapp-number"
              placeholder="+1234567890"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">
                This number can be shown to users as a backup contact method. Live chat access is now managed per-agent in the <a href="/admin/agents" className="underline">Agents</a> page.
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
