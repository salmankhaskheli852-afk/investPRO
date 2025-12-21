
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseAuthUser } from 'firebase/auth';
import { ShieldCheck, TrendingUp, Users, Copy, Gift } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


function LoginPageContent() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isRefCodeFromUrl, setIsRefCodeFromUrl] = useState(false);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setInvitationCode(refCode);
      setIsRefCodeFromUrl(true);
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
  
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();
  
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      const userDocRef = doc(firestore, 'users', googleUser.uid);
      const docSnap = await getDoc(userDocRef);
  
      if (!docSnap.exists()) {
        // New user, create a profile for them
        await createUserProfile(googleUser, invitationCode);
        // Explicitly redirect new users to their dashboard immediately after profile creation
        router.push('/user/me');
      }
      // For existing users, the useEffect hook below will handle redirection.
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createUserProfile = async (googleUser: FirebaseAuthUser, referrerIdFromInput: string | null) => {
    if (!firestore) return;
  
    try {
      let finalReferrerUid: string | null = null;
      if (referrerIdFromInput) {
        // Since we removed numericId, we assume the ref code is the user's UID
        const referrerQuery = query(collection(firestore, 'users'), where('id', '==', referrerIdFromInput));
        const referrerSnapshot = await getDocs(referrerQuery);
        if (!referrerSnapshot.empty) {
          const referrerDoc = referrerSnapshot.docs[0];
          if (referrerDoc.id !== googleUser.uid) { 
            finalReferrerUid = referrerDoc.id;
          }
        } else {
          toast({ variant: 'destructive', title: 'Invalid Referrer', description: `Referrer with ID ${referrerIdFromInput} not found.` });
        }
      }
  
      const userRef = doc(firestore, 'users', googleUser.uid);
      const walletRef = doc(firestore, 'users', googleUser.uid, 'wallets', 'main');
  
      const newUser: AppUser = {
        id: googleUser.uid,
        email: googleUser.email!,
        name: googleUser.displayName || `User ${googleUser.uid.substring(0, 5)}`,
        avatarUrl: googleUser.photoURL || `https://picsum.photos/seed/${googleUser.uid}/200`,
        role: 'user',
        investments: [],
        agentId: null,
        createdAt: serverTimestamp() as any,
        isVerified: false,
        totalDeposit: 0,
        referralId: googleUser.uid, // User's own referral ID is their UID
        referrerId: finalReferrerUid,
      };
      
      const newWallet: Wallet = {
        id: 'main',
        userId: googleUser.uid,
        balance: 0,
      };
  
      // Create user and wallet documents
      await setDoc(userRef, newUser);
      await setDoc(walletRef, newWallet);
  
    } catch (e: any) {
      console.error("Profile creation failed: ", e);
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
      });
    }
  }, [user, isUserLoading, firestore, router]);
  
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
          <CardContent className="p-8">
            <div className="flex flex-col justify-center items-center gap-2 mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-primary"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <h1 className="font-headline text-4xl font-bold text-primary">investPro</h1>
              <p className="text-muted-foreground text-sm text-center">Your trusted partner in modern investments.</p>
            </div>
            
            <div className="space-y-6">
                <Button onClick={handleGoogleSignIn} className="w-full h-12 text-md" disabled={isProcessing}>
                    {isProcessing ? (
                        'Signing in...'
                    ) : (
                        <>
                            <Image src="/google-logo.svg" alt="Google" width={20} height={20} className="mr-2" />
                            Sign in with Google
                        </>
                    )}
                </Button>

                <div className="space-y-2">
                    <Label htmlFor="invitation-code" className="flex items-center gap-1.5 text-muted-foreground">
                        <Gift className="h-4 w-4" />
                        Invitation Code (Optional)
                    </Label>
                    <Input 
                        id="invitation-code"
                        placeholder="Enter your invitation code"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        disabled={isRefCodeFromUrl}
                    />
                </div>
            </div>
            
            <div className="mt-8 flex justify-around text-muted-foreground">
                <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Secure</span>
                </div>
                 <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span>Reliable</span>
                </div>
                 <div className="flex items-center gap-2 text-xs">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>Community</span>
                </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </main>
  );
}


export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
