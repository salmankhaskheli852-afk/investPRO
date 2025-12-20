'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { User, AppSettings, ReferralRequest, Transaction } from '@/lib/data';
import { doc, collection, query, where, addDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';


export default function InvitationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [targetIdentifier, setTargetIdentifier] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);
  
  const myTeamQuery = useMemoFirebase(
    () => (user && firestore ? query(collection(firestore, 'users'), where('referrerId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: myTeam, isLoading: isLoadingTeam } = useCollection<User>(myTeamQuery);

  const transactionsQuery = useMemoFirebase(
    () => user && firestore 
      ? query(
          collection(firestore, 'users', user.uid, 'wallets', 'main', 'transactions'),
          orderBy('date', 'desc')
        )
      : null,
    [user, firestore]
  );
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const totalReferralIncome = React.useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'referral_income' && tx.status === 'completed') {
        return acc + tx.amount;
      }
      return acc;
    }, 0);
  }, [transactions]);


  const handleSendRequest = async () => {
    if (!user || !firestore || !userData) return;
    if (!targetIdentifier) {
        toast({ variant: 'destructive', title: 'User ID or Email is required' });
        return;
    }
    
    setIsSending(true);

    try {
        const isEmail = targetIdentifier.includes('@');
        
        const findUserQuery = isEmail 
            ? query(collection(firestore, 'users'), where('email', '==', targetIdentifier))
            : query(collection(firestore, 'users'), where('id', '==', targetIdentifier));

        const targetUserSnapshot = await getDocs(findUserQuery);

        if (targetUserSnapshot.empty) {
            throw new Error("User not found with the provided ID or Email.");
        }
        
        const targetUserData = targetUserSnapshot.docs[0].data() as User;
        const targetUserId = targetUserData.id;

        if (targetUserId === user.uid) {
            throw new Error('You cannot refer yourself.');
        }

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
        
        const newRequestRef = doc(collection(firestore, 'referral_requests'));
        await addDoc(collection(firestore, "referral_requests"), {
            id: newRequestRef.id,
            requesterId: user.uid,
            requesterName: userData.name,
            targetId: targetUserId,
            status: 'pending',
            createdAt: serverTimestamp(),
        });

        toast({ title: 'Request Sent!', description: `Your request to add the user has been sent.` });
        setTargetIdentifier('');

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
                <CardDescription>Enter the User ID or Email of the person you want to invite.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-uid">Member's User ID or Email</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="member-uid" value={targetIdentifier} onChange={e => setTargetIdentifier(e.target.value)} placeholder="Enter User ID or Email..." />
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
                <CardTitle className="text-4xl font-bold">{isLoadingTeam ? '...' : myTeam?.length || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Team Members</p>
              </CardContent>
            </Card>
            </div>
            <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
            <Card className="flex flex-col items-center justify-center text-center h-full">
              <CardHeader>
                <CardTitle className="text-4xl font-bold">{isLoadingTransactions ? '...' : totalReferralIncome.toLocaleString()} <span className="text-lg text-muted-foreground">PKR</span></CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Total Earnings</p>
              </CardContent>
            </Card>
            </div>
        </div>

        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
            <Card>
                <CardHeader>
                    <CardTitle>My Team</CardTitle>
                    <CardDescription>Users you have successfully referred.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Date Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingTeam ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        Loading team...
                                    </TableCell>
                                </TableRow>
                            ) : myTeam && myTeam.length > 0 ? (
                                myTeam.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{member.name}</div>
                                                    <div className="text-sm text-muted-foreground">{member.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {member.createdAt ? format(member.createdAt.toDate(), 'PPP') : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        You haven't referred any users yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
