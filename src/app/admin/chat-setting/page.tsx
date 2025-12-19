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
  isChatEnabled?: boolean;
};

export default function ChatSettingPage() {
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [isChatEnabled, setIsChatEnabled] = React.useState(false);
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
      setIsChatEnabled(chatSettings.isChatEnabled || false);
    }
  }, [chatSettings]);

  const handleSave = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await setDoc(settingsRef, { whatsappNumber, isChatEnabled }, { merge: true });
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
          <CardTitle>Live Chat Settings</CardTitle>
          <CardDescription>
            Enable or disable the live chat feature for users and agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="chat-enabled" className="text-base">
                  Enable Live Chat
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to chat with support agents in real-time.
                </p>
              </div>
              <Switch
                id="chat-enabled"
                checked={isChatEnabled}
                onCheckedChange={setIsChatEnabled}
                disabled={isLoading}
              />
            </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">WhatsApp Support Number (Optional)</Label>
            <Input
              id="whatsapp-number"
              placeholder="+1234567890"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground">Provide a WhatsApp number as a backup support channel.</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
