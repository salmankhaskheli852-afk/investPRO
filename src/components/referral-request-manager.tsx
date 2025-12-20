
'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { ReferralRequest } from '@/lib/data';
import { collection, query, where, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function ReferralRequestManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [requestToProcess, setRequestToProcess] = React.useState<ReferralRequest | null>(null);

  const incomingRequestsQuery = useMemoFirebase(
    () => user && firestore ? query(
      collection(firestore, 'referral_requests'),
      where('targetId', '==', user.uid),
      where('status', '==', 'pending')
    ) : null,
    [user, firestore]
  );
  
  const { data: incomingRequests } = useCollection<ReferralRequest>(incomingRequestsQuery);

  React.useEffect(() => {
    if (incomingRequests && incomingRequests.length > 0) {
      setRequestToProcess(incomingRequests[0]);
    } else {
      setRequestToProcess(null);
    }
  }, [incomingRequests]);

  const handleResponse = async (approved: boolean) => {
    if (!requestToProcess || !user || !firestore) return;
    
    const requestRef = doc(firestore, 'referral_requests', requestToProcess.id);
    const newStatus = approved ? 'approved' : 'rejected';

    try {
        const batch = writeBatch(firestore);
        
        // 1. Update the request status
        batch.update(requestRef, { status: newStatus });
        
        if (approved) {
            // 2. Update the target user's (current user) referrerId
            const currentUserRef = doc(firestore, 'users', user.uid);
            batch.update(currentUserRef, { referrerId: requestToProcess.requesterId });
        }
        
        await batch.commit();

        toast({
            title: `Request ${newStatus}`,
            description: `You have ${newStatus} the request from ${requestToProcess.requesterName}.`,
        });

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setRequestToProcess(null); // Close the dialog
    }
  };

  if (!requestToProcess) {
    return null;
  }

  return (
    <AlertDialog open={!!requestToProcess}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Team Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            User <span className="font-bold">{requestToProcess.requesterName}</span> has invited you to join their team. Approving will permanently link your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleResponse(false)}>Reject</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleResponse(true)}>Approve</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
