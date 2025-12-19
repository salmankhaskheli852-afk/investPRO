import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { agents, users, transactions } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AgentHistoryPage({ params }: { params: { agentId: string } }) {
  const agent = agents.find(a => a.id === params.agentId);
  const managedUsers = users.filter(u => u.agentId === params.agentId);
  const withdrawalTransactions = transactions.filter(tx => tx.type === 'withdrawal' && managedUsers.some(u => u.id === tx.userId));

  if (!agent) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline">Agent not found</h1>
        <Link href="/admin/agents">
            <Button variant="link">Go back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold font-headline">Withdrawal History for {agent.name}</h1>
            <p className="text-muted-foreground">A record of all withdrawal transactions for users managed by this agent.</p>
        </div>
       </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalTransactions.length > 0 ? (
                withdrawalTransactions.map((tx) => {
                  const user = users.find(u => u.id === tx.userId);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user?.name}</div>
                            <div className="text-sm text-muted-foreground">{user?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{tx.amount.toLocaleString()} PKR</TableCell>
                      <TableCell>
                         <Badge
                            variant={
                            tx.status === 'completed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className={tx.status === 'completed' ? 'bg-green-500/20 text-green-700' : tx.status === 'pending' ? 'bg-amber-500/20 text-amber-700' : ''}
                        >
                            {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.date}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No withdrawal history found for this agent's users.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
