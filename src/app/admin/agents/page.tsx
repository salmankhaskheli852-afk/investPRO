
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
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AdminWallet, User } from '@/lib/data';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings, History } from 'lucide-react';
import { ManageAgentAccountsDialog } from './manage-agent-accounts-dialog';
import { Badge } from '@/components/ui/badge';

function AgentRow({
  agent,
  allWallets,
  onManageAccounts,
}: {
  agent: User;
  allWallets: AdminWallet[];
  onManageAccounts: (agent: User) => void;
}) {

  const assignedWallets = React.useMemo(() => {
    if (!agent.assignedWallets || !allWallets) return [];
    return allWallets.filter(w => agent.assignedWallets!.includes(w.id));
  }, [agent.assignedWallets, allWallets]);


  return (
    <TableRow key={agent.id}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={agent.avatarUrl} alt={agent.name} />
            <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{agent.name}</div>
            <div className="text-sm text-muted-foreground">{agent.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className='flex flex-wrap gap-1'>
          {assignedWallets.length > 0 ? (
            assignedWallets.map(w => <Badge key={w.id} variant="secondary">{w.walletName}</Badge>)
          ) : (
            <span className="text-sm text-muted-foreground">No accounts</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Agent Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onManageAccounts(agent)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Accounts
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/agents/${agent.id}/history`}>
                <History className="mr-2 h-4 w-4" />
                View History
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}


export default function AdminAgentsPage() {
  const firestore = useFirestore();

  const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);
  const [selectedAgent, setSelectedAgent] = React.useState<User | null>(null);

  const agentsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), where('role', '==', 'agent')) : null,
    [firestore]
  );
  const { data: agents, isLoading: isLoadingAgents } = useCollection<User>(agentsQuery);

  const adminWalletsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'admin_wallets') : null,
    [firestore]
  );
  const { data: adminWallets, isLoading: isLoadingWallets } = useCollection<AdminWallet>(adminWalletsQuery);
  
  const handleManageAccountsClick = (agent: User) => {
    setSelectedAgent(agent);
    setIsManageDialogOpen(true);
  };
  
  const isLoading = isLoadingAgents || isLoadingWallets;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Agents</h1>
          <p className="text-muted-foreground">Assign deposit accounts and view agent history.</p>
        </div>

        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>A list of all registered agents and their assigned accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Assigned Accounts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      Loading agents...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && agents?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No agents found.
                    </TableCell>
                  </TableRow>
                )}
                {agents?.map((agent) => (
                  <AgentRow 
                    key={agent.id} 
                    agent={agent} 
                    allWallets={adminWallets || []}
                    onManageAccounts={handleManageAccountsClick} 
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>

      {selectedAgent && adminWallets && (
        <ManageAgentAccountsDialog 
          agent={selectedAgent}
          allWallets={adminWallets}
          isOpen={isManageDialogOpen}
          onOpenChange={setIsManageDialogOpen}
        />
      )}
    </>
  );
}
