
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Edit, Trash2, MoreHorizontal, Eye, ShieldCheck, UserPlus, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { User, Wallet } from '@/lib/data';
import { collection, query, where } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { EditUserRoleDialog } from './edit-user-role-dialog';
import { AssignAgentDialog } from './assign-agent-dialog';
import { Input } from '@/components/ui/input';

function UserRow({ 
  user, 
  agents,
  onEditRole,
  onAssignAgent,
}: { 
  user: User; 
  agents: User[];
  onEditRole: (user: User) => void;
  onAssignAgent: (user: User) => void;
}) {
  const firestore = useFirestore();
  const walletsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users', user.id, 'wallets')) : null,
    [firestore, user.id]
  );
  const { data: wallets, isLoading } = useCollection<Wallet>(walletsQuery);

  const wallet = wallets?.[0];
  const assignedAgent = agents.find(agent => agent.id === user.agentId);

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
        {isLoading ? '...' : `${(wallet?.balance || 0).toLocaleString()} PKR`}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{user.investments?.length || 0} plans</Badge>
      </TableCell>
       <TableCell className="capitalize">
        <Badge variant={user.role === 'admin' ? 'default' : user.role === 'agent' ? 'secondary' : 'outline'}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>{assignedAgent?.name || <span className='text-muted-foreground'>N/A</span>}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">User Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => onEditRole(user)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssignAgent(user)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Agent
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false);
  const [isAssignAgentDialogOpen, setIsAssignAgentDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const usersPerPage = 10;

  const usersQuery = useMemoFirebase(
    () => firestore && adminUser ? collection(firestore, 'users') : null,
    [firestore, adminUser]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const agentsQuery = useMemoFirebase(
    () => firestore && adminUser ? query(collection(firestore, 'users'), where('role', '==', 'agent')) : null,
    [firestore, adminUser]
  );
  const { data: agents, isLoading: isLoadingAgents } = useCollection<User>(agentsQuery);

  const handleEditRoleClick = (user: User) => {
    setSelectedUser(user);
    setIsRoleDialogOpen(true);
  };
  
  const handleAssignAgentClick = (user: User) => {
    setSelectedUser(user);
    setIsAssignAgentDialogOpen(true);
  }

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);
  
  const paginatedUsers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, currentPage, usersPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  },[searchQuery]);

  const isLoading = isLoadingUsers || isLoadingAgents;

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
              <p className="text-muted-foreground">View and manage user accounts and roles.</p>
            </div>
            <div className="w-full max-w-sm">
                <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    icon={<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
                />
            </div>
        </div>
        <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Investments</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedUsers?.map((user) => <UserRow key={user.id} user={user} agents={agents || []} onEditRole={handleEditRoleClick} onAssignAgent={handleAssignAgentClick} />)}
              </TableBody>
            </Table>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
        </div>
      </div>

      {selectedUser && (
        <EditUserRoleDialog 
          user={selectedUser}
          isOpen={isRoleDialogOpen}
          onOpenChange={setIsRoleDialogOpen}
        />
      )}

      {selectedUser && agents && (
        <AssignAgentDialog
          user={selectedUser}
          agents={agents}
          isOpen={isAssignAgentDialogOpen}
          onOpenChange={setIsAssignAgentDialogOpen}
        />
      )}
    </>
  );
}
