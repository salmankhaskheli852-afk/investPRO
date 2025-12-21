'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { User, Transaction, AppSettings, ReferralRequest } from '@/lib/data';
import { doc, collection, query, where, orderBy, getDocs, writeBatch, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Send } from 'lucide-react';


export default function InvitationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [targetUserId, setTargetUserId] = React.useState('');
  const [isSendingRequest, setIsSendingRequest] = React.useState(false);
  const [isAlreadyReferred, setIsAlreadyReferred] = React.useState(false);

  const userDocRef = useMemoFirebase(
      () => user && firestore ? doc(firestore, 'users', user.uid) : null,
      [user, firestore]
  );
  const { data: currentUserData, isLoading: isLoadingCurrentUser } = useDoc<User>(userDocRef);

  React.useEffect(() => {
      if (currentUserData?.referrerId) {
          setIsAlreadyReferred(true);
      }
  }, [currentUserData]);
  
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

  const handleSendRequest = async () => {
      if (!user || !firestore || !currentUserData) {
          toast({ variant: 'destructive', title: 'You must be logged in.' });
          return;
      }
      if (!targetUserId) {
          toast({ variant: 'destructive', title: 'Please enter a User ID.' });
          return;
      }
      if (String(currentUserData.numericId) === targetUserId) {
           toast({ variant: 'destructive', title: 'Invalid Action', description: "You cannot refer yourself." });
           return;
      }

      setIsSendingRequest(true);
      try {
          const targetUserQuery = query(collection(firestore, 'users'), where('numericId', '==', parseInt(targetUserId, 10)));
          const targetUserSnapshot = await getDocs(targetUserQuery);

          if (targetUserSnapshot.empty) {
              throw new Error("User with this ID not found.");
          }

          const targetUserData = targetUserSnapshot.docs[0].data() as User;
          
          // Check if a pending request already exists
          const existingRequestQuery = query(
              collection(firestore, 'referral_requests'),
              where('requesterId', '==', user.uid),
              where('targetId', '==', targetUserData.id),
              where('status', '==', 'pending')
          );
          const existingRequestSnapshot = await getDocs(existingRequestQuery);
          if(!existingRequestSnapshot.empty) {
              throw new Error("A pending request to this user already exists.");
          }


          const newRequestRef = doc(collection(firestore, 'referral_requests'));
          const newRequest: ReferralRequest = {
              id: newRequestRef.id,
              requesterId: user.uid,
              requesterName: currentUserData.name || 'A User',
              targetId: targetUserData.id,
              status: 'pending',
              createdAt: serverTimestamp() as any,
          };
          
          await setDoc(newRequestRef, newRequest);

          toast({ title: 'Request Sent', description: `Your referral request has been sent to User ID ${targetUserId}.` });
          setTargetUserId('');

      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsSendingRequest(false);
      }
  };


  const totalReferralIncome = React.useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'referral_income' && tx.status === 'completed') {
        return acc + tx.amount;
      }
      return acc;
    }, 0);
  }, [transactions]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Invite & Team</h1>
        <p className="text-muted-foreground">Add members to your team and earn commissions.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
          <Card>
            <CardHeader>
              <CardTitle>Join a Team</CardTitle>
              <CardDescription>
                {isAlreadyReferred 
                  ? "You are already part of a team." 
                  : "If someone invited you, enter their User ID here to join their team."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input 
                  id="target-user-id" 
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter inviter's User ID"
                  disabled={isAlreadyReferred || isSendingRequest}
                />
                <Button 
                  onClick={handleSendRequest} 
                  disabled={isAlreadyReferred || isSendingRequest || !targetUserId}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSendingRequest ? 'Sending...' : 'Send Request'}
                </Button>
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
                                                    <AvatarFallback>{member.name ? member.name.charAt(0) : 'U'}</AvatarFallback>
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
