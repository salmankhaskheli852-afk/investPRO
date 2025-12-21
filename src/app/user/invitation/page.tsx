
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { User, Transaction, AppSettings } from '@/lib/data';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy } from 'lucide-react';


export default function InvitationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userDocRef = useMemoFirebase(
      () => user && firestore ? doc(firestore, 'users', user.uid) : null,
      [user, firestore]
  );
  const { data: currentUserData, isLoading: isLoadingCurrentUser } = useDoc<User>(userDocRef);

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

  const referralLink = React.useMemo(() => {
    if (!appSettings?.baseInvitationUrl || !currentUserData?.id) return '';
    
    // Ensure the base URL ends with a slash if it doesn't already
    const baseUrl = appSettings.baseInvitationUrl.endsWith('/') 
        ? appSettings.baseInvitationUrl 
        : `${appSettings.baseInvitationUrl}/`;
        
    return `${baseUrl}?ref=${currentUserData.id}`;
  }, [appSettings, currentUserData]);

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Link Copied!',
      description: 'Your invitation link has been copied to your clipboard.',
    });
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
        <p className="text-muted-foreground">Share your link to build your team and earn commissions.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Your Invitation Link</CardTitle>
            <CardDescription>
              Share this link with your friends. When they sign up, they will automatically join your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input 
                id="referral-link" 
                value={referralLink || 'Generating link...'}
                readOnly
              />
              <Button 
                onClick={handleCopyLink} 
                disabled={!referralLink}
                aria-label="Copy Link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        

        <div className="grid grid-cols-2 gap-8">
            <Card className="flex flex-col items-center justify-center text-center h-full rounded-lg">
              <CardHeader>
                <CardTitle className="text-4xl font-bold">{isLoadingTeam ? '...' : myTeam?.length || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Team Members</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center h-full rounded-lg">
              <CardHeader>
                <CardTitle className="text-4xl font-bold">{isLoadingTransactions ? '...' : totalReferralIncome.toLocaleString()} <span className="text-lg text-muted-foreground">PKR</span></CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Total Earnings</p>
              </CardContent>
            </Card>
        </div>

        <Card className="rounded-lg">
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
  );
}
