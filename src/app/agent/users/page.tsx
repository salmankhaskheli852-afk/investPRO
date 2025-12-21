
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
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import type { User, Wallet, InvestmentPlan } from '@/lib/data';
import { collection, query, where, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


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
        return user.investments.reduce((sum, investment) => {
            const plan = allPlans.find(p => p.id === investment.planId);
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
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">User Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild>
                            <Link href={`/agent/users/${user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}


export default function AgentUsersPage() {
  const { user: agentUser } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const agentDocRef = useMemoFirebase(
      () => agentUser ? doc(firestore, 'users', agentUser.uid) : null,
      [firestore, agentUser]
  );
  const { data: agentData, isLoading: isLoadingAgent } = useDoc<User>(agentDocRef);

  const managedUsersQuery = useMemoFirebase(
    () => {
        if (!firestore || !agentUser || !agentData) return null;

        if (agentData.permissions?.canViewAllUsers) {
             return query(collection(firestore, 'users'), where('role', '==', 'user'));
        }
        return query(collection(firestore, 'users'), where('agentId', '==', agentUser.uid))
    },
    [firestore, agentUser, agentData]
  );
  const { data: managedUsers, isLoading: isLoadingUsers } = useCollection<User>(managedUsersQuery);

  const filteredUsers = React.useMemo(() => {
    if (!managedUsers) return [];
    if (!searchQuery) return managedUsers;
    return managedUsers.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [managedUsers, searchQuery]);

  const isLoading = isLoadingUsers || isLoadingAgent;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline">My Managed Users</h1>
            <p className="text-muted-foreground">An overview of all users assigned to you.</p>
        </div>
        <div className="w-full max-w-sm">
            <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                icon={<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
            />
        </div>
      </div>


      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Total Invested</TableHead>
                <TableHead>Active Plans</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">Loading users...</TableCell>
                </TableRow>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => <ManagedUserRow key={user.id} user={user} />)
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell>
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
