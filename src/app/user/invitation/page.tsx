
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import type { User, AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';

export default function InvitationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  const invitationLink = React.useMemo(() => {
    if (!appSettings?.baseInvitationUrl || !userData?.referralId) return '';
    const baseUrl = appSettings.baseInvitationUrl.endsWith('/') ? appSettings.baseInvitationUrl : `${appSettings.baseInvitationUrl}/`;
    return `${baseUrl}?ref=${userData.referralId}`;
  }, [appSettings, userData]);

  const copyToClipboard = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    toast({
      title: 'Copied to clipboard!',
      description: 'You can now share your invitation link.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Invite Friends</h1>
        <p className="text-muted-foreground">Share your link and earn commissions on their first deposit.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card>
          <CardHeader>
            <CardTitle>Your Invitation Link</CardTitle>
            <CardDescription>Share this link with your friends to invite them to investPro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-link">Your Unique Link</Label>
              <div className="flex items-center space-x-2">
                <Input id="invitation-link" value={invitationLink} readOnly />
                <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!invitationLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When a user signs up using your link, you will earn {appSettings?.referralCommissionPercentage || 0}% commission on their first deposit.
            </p>
          </CardContent>
        </Card>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
            <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
            <Card className="flex flex-col items-center justify-center text-center h-full">
              <CardHeader>
                <CardTitle className="text-4xl font-bold">{userData?.referralCount || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Friends Invited</p>
              </CardContent>
            </Card>
            </div>
            <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
            <Card className="flex flex-col items-center justify-center text-center h-full">
              <CardHeader>
                <CardTitle className="text-4xl font-bold">{(userData?.referralIncome || 0).toLocaleString()} <span className="text-lg text-muted-foreground">PKR</span></CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Total Earnings</p>
              </CardContent>
            </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
