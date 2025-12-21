
'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, TrendingUp, Users, User } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

const provider = new GoogleAuthProvider();

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const referralIdFromUrl = searchParams.get('ref');

  const handleSignIn = async () => {
    if (!auth || !firestore) {
      console.error("Firebase Auth or Firestore not initialized");
      toast({
        variant: 'destructive',
        title: 'Initialization Error',
        description: 'Firebase is not ready. Please try again in a moment.'
      });
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const batch = writeBatch(firestore);

        const newUser: Partial<AppUser> = {
            id: user.uid,
            name: user.displayName || 'New User',
            email: user.email || '',
            avatarUrl: user.photoURL || '',
            role: 'user',
            investments: [],
            agentId: null,
            referralId: user.uid,
            createdAt: serverTimestamp() as any,
        };

        if (referralIdFromUrl) {
            const referrerRef = doc(firestore, 'users', referralIdFromUrl);
            const referrerDoc = await getDoc(referrerRef);
            if (referrerDoc.exists()) {
                newUser.referrerId = referralIdFromUrl;
            }
        }
        
        batch.set(userRef, newUser, { merge: true });

        const walletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
        const newWallet: Wallet = {
            id: 'main',
            userId: user.uid,
            balance: 0,
        };
        batch.set(walletRef, newWallet);

        await batch.commit();
      }

      router.push('/user/me');

    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: error.message || 'An unexpected error occurred during sign-in.'
      });
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/user/me');
    }
  }, [user, isUserLoading, router]);
  
  if (isUserLoading || user) {
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
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center items-center gap-2">
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

            <p className="text-muted-foreground">Your trusted partner in modern investments.</p>

            <Button size="lg" className="w-full" onClick={handleSignIn}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.108-11.283-7.481l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.902,35.636,44,29.592,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              Sign in with Google
            </Button>
            
            <div className="flex justify-around items-center pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Reliable</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Community</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
