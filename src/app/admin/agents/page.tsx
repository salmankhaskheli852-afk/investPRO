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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/data';
import { collection, query, where } from 'firebase/firestore';


export default function AdminAgentsPage() {
  const firestore = useFirestore();

  // In a real app, agents might be a separate collection or have a 'role' field.
  // We'll simulate this by querying for users who are marked as agents.
  const agentsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), where('role', '==', 'agent')) : null,
    [firestore]
  );
  const { data: agents, isLoading } = useCollection<User>(agentsQuery);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Manage Agents</h1>
        <p className="text-muted-foreground">Control agent permissions and view their history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Permissions</CardTitle>
          <CardDescription>Enable or disable deposit and withdrawal functionalities for each agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Withdrawal</TableHead>
                <TableHead className="text-right">History</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading agents...
                  </TableCell>
                </TableRow>
              )}
               {!isLoading && agents?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No agents found.
                  </TableCell>
                </TableRow>
              )}
              {agents?.map((agent) => (
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
                    <Switch defaultChecked />
                  </TableCell>
                  <TableCell>
                    <Switch defaultChecked />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                       <Link href={`/admin/agents/${agent.id}/history`}>
                        View History
                       </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
