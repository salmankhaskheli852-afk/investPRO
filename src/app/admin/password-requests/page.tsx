
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
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PasswordResetRequest } from '@/lib/data';

function PasswordRequestRow({ request, onUpdate }: { request: PasswordResetRequest; onUpdate: () => void; }) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const firestore = useFirestore();

  const handleApprove = async () => {
    setIsProcessing(true);
    const functions = getFunctions();
    const updateUserPassword = httpsCallable(functions, 'updateUserPassword');
    try {
      await updateUserPassword({ userId: request.userId, newPassword: request.newPassword });
      
      const requestRef = doc(firestore, 'password_reset_requests', request.id);
      await updateDoc(requestRef, { status: 'approved' });

      toast({ title: 'Password Updated', description: `Password for ${request.userName} has been updated.` });
      onUpdate();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReject = async () => {
    setIsProcessing(true);
     try {
       const requestRef = doc(firestore, 'password_reset_requests', request.id);
       await deleteDoc(requestRef); // Or update status to 'rejected'
       toast({ title: 'Request Rejected' });
       onUpdate();
     } catch (error: any) {
       toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
     } finally {
       setIsProcessing(false);
     }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{request.userName}</div>
        <div className="text-sm text-muted-foreground">{request.userPhoneNumber}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
            {showPassword ? (
                <span className="font-mono">{request.newPassword}</span>
            ) : (
                <span className="font-mono">••••••••</span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
      </TableCell>
      <TableCell>{request.createdAt ? format(request.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AdminPasswordRequestsPage() {
  const firestore = useFirestore();
  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'password_reset_requests'), where('status', '==', 'pending')) : null),
    [firestore]
  );
  const { data: requests, isLoading, forceRefetch } = useCollection<PasswordResetRequest>(requestsQuery);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Password Reset Requests</h1>
        <p className="text-muted-foreground">Approve or reject user password reset requests.</p>
      </div>

      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>Review the following password reset requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested Password</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : requests && requests.length > 0 ? (
                  requests.map((req) => (
                    <PasswordRequestRow key={req.id} request={req} onUpdate={forceRefetch} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No pending password reset requests.
                    </TableCell>
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
