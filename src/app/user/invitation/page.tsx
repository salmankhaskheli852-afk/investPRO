
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { User, Transaction, ReferralRequest } from '@/lib/data';
import { doc, collection, query, where, orderBy, getDocs, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
    if (!user || !firestore || !userData || !targetIdentifier) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing information.' });
      return;
    }
    setIsSending(true);

    try {
        // Determine if identifier is email or UID
        const isEmail = targetIdentifier.includes('@');
        let targetQuery;
        if (isEmail) {
            targetQuery = query(collection(firestore, 'users'), where('email', '==', targetIdentifier));
        } else {
            // Assume it's a UID. A simple getDoc would be more efficient if we're sure it's a UID.
            // But for flexibility, we'll query.
             targetQuery = query(collection(firestore, 'users'), where('id', '==', targetIdentifier));
        }
        
        const targetSnapshot = await getDocs(targetQuery);

        if (targetSnapshot.empty) {
            throw new Error('User not found. Please check the ID or Email and try again.');
        }

        const targetUser = targetSnapshot.docs[0].data() as User;

        if (targetUser.id === user.uid) {
            throw new Error("You cannot send a referral request to yourself.");
        }

        if (targetUser.referrerId) {
            throw new Error('This user has already been referred by someone else.');
        }

        const existingRequestQuery = query(collection(firestore, 'referral_requests'), 
            where('requesterId', '==', user.uid),
            where('targetId', '==', targetUser.id)
        );
        const existingRequestSnapshot = await getDocs(existingRequestQuery);
        if (!existingRequestSnapshot.empty) {
            throw new Error('You have already sent a request to this user.');
        }

        await addDoc(collection(firestore, 'referral_requests'), {
            requesterId: user.uid,
            requesterName: userData.name,
            targetId: targetUser.id,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        
        toast({ title: 'Request Sent!', description: `Your invitation has been sent to ${targetUser.name}.` });
        setTargetIdentifier('');

    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Error Sending Request',
            description: e.message || 'An unknown error occurred.',
        });
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
                <CardTitle>Send a Team Invitation</CardTitle>
                <CardDescription>Enter the User ID or Email of the person you want to invite.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invitation-target">Enter User ID or Email</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="invitation-target" value={targetIdentifier} onChange={(e) => setTargetIdentifier(e.target.value)} placeholder="User ID or email address" />
                    <Button onClick={handleSendRequest} disabled={isSending || !targetIdentifier}>
                      {isSending ? 'Sending...' : 'Send Request'}
                    </Button>
                  </div>
                </div>
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
