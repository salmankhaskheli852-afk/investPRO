
'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseAuthUser, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
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

  // Phone auth state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setInvitationCode(refCode);
      setIsRefCodeFromUrl(true);
    }
  }, [searchParams]);

  const setupRecaptcha = () => {
    if (!auth) return;
    // Destroy previous instance if it exists
    if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
    }
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      },
    });
  };

  const onSignInSubmit = async () => {
    if (!auth) return;
    setIsProcessing(true);
    setupRecaptcha();
    
    try {
      const appVerifier = recaptchaVerifierRef.current!;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${phone}.` });
    } catch (error: any) {
      console.error("Phone Sign-In Error:", error);
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear(); // Clear verifier on error
      }
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmationResult) return;
    setIsProcessing(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const phoneUser = result.user;
      
      const userDocRef = doc(firestore, 'users', phoneUser.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        await createUserProfile(phoneUser, invitationCode, phone);
      }
      // Redirection will be handled by the useEffect hook
    } catch (error: any) {
       console.error("OTP Verification Error:", error);
      toast({
        variant: 'destructive',
        title: 'OTP Verification Failed',
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  }

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
        await createUserProfile(googleUser, invitationCode, null);
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

  const createUserProfile = async (user: FirebaseAuthUser, referrerIdFromInput: string | null, phoneNumber: string | null) => {
    if (!firestore) return;
  
    try {
      let finalReferrerUid: string | null = null;
      if (referrerIdFromInput) {
        const referrerQuery = query(collection(firestore, 'users'), where('id', '==', referrerIdFromInput));
        const referrerSnapshot = await getDocs(referrerQuery);
        if (!referrerSnapshot.empty) {
          const referrerDoc = referrerSnapshot.docs[0];
          if (referrerDoc.id !== user.uid) { 
            finalReferrerUid = referrerDoc.id;
          }
        } else {
          toast({ variant: 'destructive', title: 'Invalid Referrer', description: `Referrer with ID ${referrerIdFromInput} not found.` });
        }
      }
  
      const userRef = doc(firestore, 'users', user.uid);
      const walletRef = doc(firestore, 'users', user.uid, 'wallets', 'main');
  
      const newUser: AppUser = {
        id: user.uid,
        email: user.email || '',
        phoneNumber: user.phoneNumber || phoneNumber || '',
        name: user.displayName || `User ${user.uid.substring(0, 5)}`,
        avatarUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
        role: 'user',
        investments: [],
        agentId: null,
        createdAt: serverTimestamp() as any,
        isVerified: false,
        totalDeposit: 0,
        referralId: user.uid,
        referrerId: finalReferrerUid,
      };
      
      const newWallet: Wallet = {
        id: 'main',
        userId: user.uid,
        balance: 0,
      };
  
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
        } else {
            // This might happen in a race condition where the doc is not yet created
            // We give it a second and then try to create it.
            setTimeout(() => {
                 getDoc(userDocRef).then(async (snap) => {
                     if (!snap.exists()) {
                         if (user.providerData[0].providerId === 'phone') {
                             await createUserProfile(user, invitationCode, user.phoneNumber);
                         } else {
                             await createUserProfile(user, invitationCode, null);
                         }
                         router.push('/user/me');
                     }
                 })
            }, 1000);
        }
      });
    }
  }, [user, isUserLoading, firestore, router, invitationCode]);
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-login-gradient p-4">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-sm rounded-xl p-1 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="shadow-lg overflow-hidden rounded-xl">
          <CardContent>
            <div className="relative h-48 w-full">
              <Image src="/logo.png" alt="investPro Logo" fill className="object-cover" />
            </div>
            <div className="flex flex-col justify-center items-center gap-2 py-8">
              <h1 className="font-headline text-4xl font-bold text-primary">investPro</h1>
              <p className="text-muted-foreground text-sm text-center">Your trusted partner in modern investments.</p>
            </div>
            
            <div className="space-y-6 px-8 pb-8">
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
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>

                {!isOtpSent ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" placeholder="+1 123 456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <Button onClick={onSignInSubmit} className="w-full" disabled={isProcessing || !phone}>
                      {isProcessing ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP</Label>
                      <Input id="otp" type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    </div>
                    <Button onClick={verifyOtp} className="w-full" disabled={isProcessing || !otp}>
                      {isProcessing ? 'Verifying...' : 'Verify OTP & Sign In'}
                    </Button>
                  </div>
                )}

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
            
            <div className="mt-8 flex justify-around text-muted-foreground p-8 border-t">
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
