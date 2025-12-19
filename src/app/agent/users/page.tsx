
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { User, Wallet, InvestmentPlan } from '@/lib/data';
import { collection, query, where } from 'firebase/firestore';


function ManagedUserRow({ user }: { user: User }) {
    const firestore = useFirestore();

    const walletQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'users', user.id, 'wallets'), where('userId', '==', user.id)) : null,
        [firestore, user.id]
    );
    const { data: wallets, isLoading: isLoadingWallet } = useCollection<Wallet>(walletQuery);
    const wallet = wallets?.[0];

    const plansQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'investment_plans') : null,
        [firestore]
    );
    const { data: allPlans, isLoading: isLoadingPlans } = useCollection<InvestmentPlan>(plansQuery);
    
    const totalInvested = React.useMemo(() => {
        if (!user.investments || !allPlans) return 0;
        return user.investments.reduce((sum, planId) => {
            const plan = allPlans.find(p => p.id === planId);
            return sum + (plan?.price || 0);
        }, 0);
    }, [user.investments, allPlans]);


    return (
        <TableRow key={user.id}>
            <TableCell>
            <div className="flex items-center gap-3">
                <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
            </div>
            </TableCell>
            <TableCell>
                {isLoadingWallet ? '...' : `${(wallet?.balance || 0).toLocaleString()} PKR`}
            </TableCell>
             <TableCell>
                {isLoadingPlans ? '...' : `${totalInvested.toLocaleString()} PKR`}
            </TableCell>
            <TableCell>
            <Badge variant="outline">{user.investments?.length || 0}</Badge>
            </TableCell>
        </TableRow>
    )
}


export default function AgentUsersPage() {
  const { user: agentUser } = useUser();
  const firestore = useFirestore();

  const managedUsersQuery = useMemoFirebase(
    () => (firestore && agentUser ? query(collection(firestore, 'users'), where('agentId', '==', agentUser.uid)) : null),
    [firestore, agentUser]
  );
  const { data: managedUsers, isLoading: isLoadingUsers } = useCollection<User>(managedUsersQuery);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Managed Users</h1>
        <p className="text-muted-foreground">An overview of all users assigned to you.</p>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Total Invested</TableHead>
                <TableHead>Active Plans</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">Loading users...</TableCell>
                </TableRow>
              ) : managedUsers && managedUsers.length > 0 ? (
                managedUsers.map((user) => <ManagedUserRow key={user.id} user={user} />)
              ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No users assigned to you.</TableCell>
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
