import { DashboardStatsCard } from '@/components/dashboard-stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { agents, users, transactions } from '@/lib/data';
import { DollarSign, Users, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AgentDashboardPage() {
  const agent = agents[0]; // Mock current agent
  const managedUsers = users.filter(u => u.agentId === agent.id);
  const userActivities = transactions
    .filter(tx => managedUsers.some(u => u.id === tx.userId))
    .slice(0, 5);
  
  const totalCommission = userActivities.reduce((acc, tx) => acc + (tx.type === 'investment' ? tx.amount * 0.05 : 0), 0); // Mock 5% commission

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Agent Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardStatsCard
          title="My Users"
          value={managedUsers.length.toString()}
          description="Total users under your management"
          Icon={Users}
        />
        <DashboardStatsCard
          title="Total Commission"
          value={`${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR`}
          description="Your estimated earnings"
          Icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent User Activity
          </CardTitle>
          <CardDescription>Latest transactions from users you manage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userActivities.map((tx) => {
                const user = users.find(u => u.id === tx.userId);
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                          <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{tx.type}</TableCell>
                    <TableCell className="text-right font-medium">{tx.amount.toLocaleString()} PKR</TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.status === 'completed' ? 'default' : 'secondary'}
                        className={tx.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {tx.status}
                      </Badge>
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
