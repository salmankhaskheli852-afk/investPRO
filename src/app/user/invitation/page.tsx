'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import type { User, AppSettings, ReferralRequest } from '@/lib/data';
import { doc, collection, query, where, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

export default function InvitationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [targetUserId, setTargetUserId] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

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
  
  const handleSendRequest = async () => {
    if (!user || !firestore || !userData) return;
    if (!targetUserId) {
        toast({ variant: 'destructive', title: 'User ID is required' });
        return;
    }
    if (targetUserId === user.uid) {
        toast({ variant: 'destructive', title: 'Invalid Action', description: 'You cannot refer yourself.' });
        return;
    }
    
    setIsSending(true);

    try {
        // Check if target user exists and doesn't already have a referrer
        const targetUserRef = doc(firestore, 'users', targetUserId);
        const targetUserDoc = await getDocs(query(collection(firestore, 'users'), where('id', '==', targetUserId)));

        if (targetUserDoc.empty) {
            throw new Error("User with this ID does not exist.");
        }
        const targetUserData = targetUserDoc.docs[0].data() as User;
        if (targetUserData.referrerId) {
            throw new Error("This user has already been referred by someone else.");
        }

        // Check if a pending request already exists
        const existingRequestQuery = query(
            collection(firestore, 'referral_requests'),
            where('requesterId', '==', user.uid),
            where('targetId', '==', targetUserId)
        );
        const existingRequestSnapshot = await getDocs(existingRequestQuery);
        if (!existingRequestSnapshot.empty) {
             const existingRequest = existingRequestSnapshot.docs[0].data() as ReferralRequest;
             if(existingRequest.status === 'pending') {
                throw new Error("You already have a pending request for this user.");
             }
             if(existingRequest.status === 'approved') {
                 throw new Error("This user is already in your team.");
             }
        }
        
        await addDoc(collection(firestore, 'referral_requests'), {
            requesterId: user.uid,
            requesterName: userData.name,
            targetId: targetUserId,
            status: 'pending',
            createdAt: serverTimestamp(),
        });

        toast({ title: 'Request Sent!', description: `Your request to add the user has been sent.` });
        setTargetUserId('');

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setIsSending(false);
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Invite Friends</h1>
        <p className="text-muted-foreground">Add members to your team and earn commissions.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
          <Card>
            <CardHeader>
              <CardTitle>Add Team Member</CardTitle>
              <CardDescription>Enter the User ID of the person you want to invite.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-uid">Member's User ID</Label>
                <div className="flex items-center space-x-2">
                  <Input id="member-uid" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} placeholder="Enter User ID..." />
                  <Button onClick={handleSendRequest} disabled={isSending}>
                    {isSending ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                When a user approves your request, you will earn {appSettings?.referralCommissionPercentage || 0}% commission on their future deposits.
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
                <p className="text-muted-foreground">Team Members</p>
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
