
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { User, Transaction, AppSettings } from '@/lib/data';
import { doc, collection, query, where, orderBy, getDocs, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy } from 'lucide-react';


export default function InvitationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [invitationLink, setInvitationLink] = React.useState('');

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

  React.useEffect(() => {
    if (user && appSettings?.baseInvitationUrl) {
      const url = new URL(appSettings.baseInvitationUrl);
      url.searchParams.set('ref', user.uid);
      setInvitationLink(url.toString());
    } else if (user) {
      const url = new URL(window.location.origin);
      url.searchParams.set('ref', user.uid);
      setInvitationLink(url.toString());
    }
  }, [user, appSettings]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
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
        <h1 className="text-3xl font-bold font-headline">Invite Friends</h1>
        <p className="text-muted-foreground">Add members to your team and earn commissions.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
          <Card>
            <CardHeader>
              <CardTitle>Your Invitation Link</CardTitle>
              <CardDescription>Share this link with your friends to invite them to your team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input id="invitation-link" value={invitationLink} readOnly />
                <Button onClick={handleCopyLink} disabled={!invitationLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
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
