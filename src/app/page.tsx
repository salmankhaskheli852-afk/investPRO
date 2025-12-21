
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [invitationCode, setInvitationCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCodeFromUrl, setIsCodeFromUrl] = useState(false);

  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      setInvitationCode(refFromUrl);
      setIsCodeFromUrl(true);
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    setIsProcessing(true);

    const provider = new GoogleAuthProvider();
    try {
      const result: UserCredential = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;

      if (loggedInUser) {
        const userDocRef = doc(firestore, 'users', loggedInUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          // New user, create their profile
          await createUserProfile(loggedInUser.uid, loggedInUser.email!, loggedInUser.displayName, loggedInUser.photoURL, invitationCode);
        }
        // Whether new or existing, now redirect
        router.push('/user/me');
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message || 'An unknown error occurred.',
      });
      setIsProcessing(false);
    }
  };

  const createUserProfile = async (uid: string, email: string, name: string | null, photoURL: string | null, referrerIdFromInput: string | null) => {
    if (!firestore) return;

    const counterRef = doc(firestore, 'counters', 'user_id_counter');
    const userRef = doc(firestore, 'users', uid);
    const walletRef = doc(firestore, 'users', uid, 'wallets', 'main');

    try {
      await runTransaction(firestore, async (transaction) => {
        let referrerValid = false;
        let referrerDoc;
        if (referrerIdFromInput) {
          const numericReferrerId = parseInt(referrerIdFromInput, 10);
          if (!isNaN(numericReferrerId)) {
            const referrerQuery = query(collection(firestore, 'users'), where('numericId', '==', numericReferrerId));
            const referrerSnapshot = await getDocs(referrerQuery);
            if (!referrerSnapshot.empty) {
                referrerDoc = referrerSnapshot.docs[0];
                if(referrerDoc.id !== uid) { // Can't refer yourself
                    referrerValid = true;
                }
            }
          }
        }

        const counterDoc = await transaction.get(counterRef);
        let newNumericId = 1001;
        if (counterDoc.exists()) {
          newNumericId = (counterDoc.data().currentId || 1000) + 1;
        }
        transaction.set(counterRef, { currentId: newNumericId }, { merge: true });

        const newUser: Partial<AppUser> = {
          id: uid,
          numericId: newNumericId,
          email: email,
          name: name || `User ${String(newNumericId)}`,
          avatarUrl: photoURL || `https://picsum.photos/seed/${newNumericId}/200`,
          role: 'user',
          investments: [],
          agentId: null,
          createdAt: serverTimestamp() as any,
          isVerified: false,
          totalDeposit: 0,
        };
        
        if (referrerValid && referrerDoc) {
          newUser.referrerId = referrerDoc.id;
        }

        transaction.set(userRef, newUser);

        const newWallet: Wallet = {
          id: 'main',
          userId: uid,
          balance: 0,
        };
        transaction.set(walletRef, newWallet);
      });
    } catch (e: any) {
      console.error("Transaction failed: ", e);
      toast({ variant: 'destructive', title: 'Profile Creation Failed', description: e.message });
      throw new Error("Could not create user profile.");
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as AppUser;
          if (userData.role === 'admin') {
            router.push('/admin');
          } else if (userData.role === 'agent') {
            router.push('/agent');
          } else {
            router.push('/user/me');
          }
        }
        // If doc doesn't exist, it means user just signed up via popup and profile was created.
        // The redirection is handled inside handleGoogleSignIn.
      });
    } else if (!isUserLoading && !user) {
        setIsProcessing(false);
    }
  }, [user, isUserLoading, firestore, router]);
  
  if (isUserLoading || (user && !isProcessing)) { // Show loading until auth state is confirmed and user doc loaded
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl p-1 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-center items-center gap-2 mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-primary"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <h1 className="font-headline text-4xl font-bold text-primary">investPro</h1>
            </div>

            <div className="space-y-6">
              <Button onClick={handleGoogleSignIn} className="w-full h-12 rounded-full text-lg" variant="outline" disabled={isProcessing}>
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.1 0 128.1 111.8 16.5 244 16.5c70.3 0 129.5 27.2 176.4 71.8l-68.3 64.6C314.5 118.2 282.8 100 244 100c-77.5 0-140.7 63.2-140.7 140.7s63.2 140.7 140.7 140.7c86.3 0 112.5-63.2 115.8-93.1H244v-75.5h236.4c2.5 13.3 3.6 27.5 3.6 42.9z"></path>
                </svg>
                {isProcessing ? 'Processing...' : 'Sign in with Google'}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="invitation-code">Invitation Code (Optional)</Label>
                <Input 
                  id="invitation-code" 
                  type="text" 
                  placeholder="Code from your inviter"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  icon={<Heart className="h-5 w-5 text-muted-foreground" />}
                  readOnly={isCodeFromUrl}
                  className={isCodeFromUrl ? 'bg-muted/50 cursor-not-allowed' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
