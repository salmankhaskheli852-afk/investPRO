
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import type { User, Transaction, AgentPermissions } from '@/lib/data';
import { collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function HistoryRow({ tx, user }: { tx: Transaction; user: User | undefined }) {
  const getStatusBadge = () => {
    switch (tx.status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700';
      case 'pending':
        return 'bg-amber-500/20 text-amber-700';
      case 'failed':
        return 'bg-red-500/20 text-red-700';
      case 'revoked':
          return 'bg-gray-500/20 text-gray-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
      <TableCell>{tx.amount.toLocaleString()} PKR</TableCell>
      <TableCell>
        <Badge variant='outline' className={getStatusBadge()}>
          {tx.status}
        </Badge>
      </TableCell>
      <TableCell>{tx.date ? format(tx.date.toDate(), 'PPpp') : 'N/A'}</TableCell>
    </TableRow>
  );
}

export default function AgentHistorySearchPage() {
  const { user: agentUser } = useUser();
  const firestore = useFirestore();
  
  const [searchDigits, setSearchDigits] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<{ user: User, transactions: Transaction[] }[]>([]);
  const [searched, setSearched] = React.useState(false);

  const agentDocRef = useMemoFirebase(
      () => agentUser && firestore ? doc(firestore, 'users', agentUser.uid) : null,
      [firestore, agentUser]
  );
  const { data: agentData } = useDoc<User>(agentDocRef);

  const handleSearch = async () => {
    if (!firestore || !agentUser || !agentData || searchDigits.length !== 3) {
        setSearched(true);
        setSearchResults([]);
        return;
    }
    
    setIsSearching(true);
    setSearched(true);
    setSearchResults([]);

    try {
        let usersToSearchQuery;

        if (agentData.permissions?.canViewAllUsers) {
            // Permission to view all users, fetch everyone with role 'user'
            usersToSearchQuery = query(collection(firestore, 'users'), where('role', '==', 'user'));
        } else {
            // Default: fetch only users assigned to this agent
            usersToSearchQuery = query(collection(firestore, 'users'), where('agentId', '==', agentUser.uid));
        }

        const usersSnapshot = await getDocs(usersToSearchQuery);
        const matchingUsers = usersSnapshot.docs
            .map(d => d.data() as User)
            .filter(u => u.id.endsWith(searchDigits));

        const results = [];
        for (const user of matchingUsers) {
            const transactionsQuery = query(
                collection(firestore, 'users', user.id, 'wallets', 'main', 'transactions'),
                orderBy('date', 'desc')
            );
            const transactionsSnapshot = await getDocs(transactionsQuery);
            const transactions = transactionsSnapshot.docs.map(d => d.data() as Transaction);
            results.push({ user, transactions });
        }
        setSearchResults(results);

    } catch (error) {
        console.error("Error searching user history:", error);
    } finally {
        setIsSearching(false);
    }
  };

  if (agentData && !agentData.permissions?.canViewUserHistory) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view user history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">User History Search</h1>
        <p className="text-muted-foreground">Find a user's transaction history by the last 3 digits of their ID.</p>
      </div>

      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="Enter last 3 digits of User ID"
          value={searchDigits}
          onChange={(e) => setSearchDigits(e.target.value)}
          maxLength={3}
          className="pl-10"
          icon={<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
        />
        <Button onClick={handleSearch} disabled={isSearching || searchDigits.length !== 3}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {searched && searchResults.length === 0 && !isSearching && (
        <p className="text-center text-muted-foreground pt-8">No users found with an ID ending in "{searchDigits}".</p>
      )}

      <div className="space-y-8">
        {searchResults.map(({ user, transactions }) => (
          <div key={user.id} className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>ID: {user.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length > 0 ? (
                      transactions.map(tx => <HistoryRow key={tx.id} tx={tx} user={user} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No transactions found for this user.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
