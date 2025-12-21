
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, writeBatch, increment, query, where, runTransaction, getDocs, addDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { User, PasswordResetRequest } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

// By exporting this, we tell Next.js to always render this page dynamically
// which is required because we are using useSearchParams.
export const dynamic = 'force-dynamic';

function LoggedInRedirect() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  React.useEffect(() => {
    if (!isUserLoading && !isUserDataLoading && userData) {
      if (userData.role === 'admin') {
        router.push('/admin');
      } else if (userData.role === 'agent') {
        router.push('/agent');
      } else {
        router.push('/user');
      }
    }
  }, [userData, isUserLoading, isUserDataLoading, router]);

  // Render nothing while checking for user data
  return null;
}


function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleAdminLogin = async () => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.role === 'agent') {
          router.push('/agent');
        } else {
          router.push('/user');
        }
      } else {
        // This is a new user signing in with Google
        // Let's create a profile for them
        const nameParts = user.displayName?.split(' ') || ['User'];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        const newUserProfile: Partial<User> = {
          id: user.uid,
          name: user.displayName || 'New User',
          email: user.email || undefined,
          role: 'user', // Default role for new sign-ups
          referralId: user.uid,
          createdAt: serverTimestamp() as any,
          investments: [],
          avatarUrl: user.photoURL || undefined,
        };

        const batch = writeBatch(firestore);
        batch.set(userDocRef, newUserProfile, { merge: true });

        const walletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
        batch.set(walletRef, {
          id: 'main',
          userId: user.uid,
          balance: 0,
        });

        await batch.commit();
        router.push('/user');
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Could not log in with Google. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <main className="flex min-h-screen flex-col items-center bg-login-gradient p-4 pt-16 sm:pt-24">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-login-gradient -z-10">
          <div 
              className="absolute inset-0 bg-no-repeat bg-cover opacity-10"
              style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'white\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}
            />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-2 shadow-lg">
                <Image src="https://picsum.photos/seed/bshlogo/80/80" alt="BSH Logo" width={80} height={80} className="rounded-full" data-ai-hint="company logo" />
            </div>
        </div>

        <Card className="w-full shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-center mb-2 font-headline">Welcome to investPro</h2>
            <p className="text-center text-muted-foreground mb-6">Your trusted partner in investment.</p>
            <Button variant="outline" className="w-full h-12 text-base" onClick={handleAdminLogin} disabled={isLoading}>
                <svg className="mr-2 h-5 w-5" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 260.8 0 119.3 109.8 11.8 244 11.8c72.1 0 134.3 31.5 178.4 81.4l-74.2 67.5c-24.3-23-58.8-38.2-97.3-38.2-83.8 0-151.4 68.1-151.4 152.4s67.6 152.4 151.4 152.4c97.1 0 134.3-70.8 138.6-106.3H244v-87.9h244c4.6 24.8 7 52.1 7 82.8z"></path></svg>
                {isLoading ? 'Logging in...' : 'Sign in with Google'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function Home() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <LoggedInRedirect />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPage />
    </Suspense>
  );
}
