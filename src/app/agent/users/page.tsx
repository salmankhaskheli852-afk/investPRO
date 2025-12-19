import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { agents, users, investmentPlans } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function AgentUsersPage() {
  const agent = agents[0]; // Mock current agent
  const managedUsers = users.filter(u => u.agentId === agent.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Managed Users</h1>
        <p className="text-muted-foreground">An overview of all users assigned to you.</p>
      </div>

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
              {managedUsers.map((user) => {
                const totalInvested = user.investments.reduce((sum, planId) => {
                  const plan = investmentPlans.find(p => p.id === planId);
                  return sum + (plan?.price || 0);
                }, 0);

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
                    <TableCell>{user.walletBalance.toLocaleString()} PKR</TableCell>
                    <TableCell>{totalInvested.toLocaleString()} PKR</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.investments.length}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
