
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection, DocumentReference } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const googleProvider = new GoogleAuthProvider();

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const referralIdFromUrl = searchParams.get('ref');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Setup reCAPTCHA verifier
  useEffect(() => {
    if (!auth) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }, [auth]);

  const handleSendCode = async () => {
    if (!auth) return toast({ variant: 'destructive', title: 'Auth not ready' });
    if (!phoneNumber.match(/^\+92[0-9]{10}$/)) {
        return toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please use the format +923xxxxxxxxx' });
    }

    setIsProcessing(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setIsCodeSent(true);
      toast({ title: 'Code Sent', description: 'A verification code has been sent to your phone.' });
    } catch (error: any) {
      console.error("Phone auth error:", error);
      toast({ variant: 'destructive', title: 'Failed to send code', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleVerifyCode = async (isRegistering: boolean) => {
    if (!confirmationResult) return toast({ variant: 'destructive', title: 'Verification failed', description: 'Please request a new code.' });
    if (verificationCode.length !== 6) return toast({ variant: 'destructive', title: 'Invalid Code', description: 'Code must be 6 digits.' });

    setIsProcessing(true);
    try {
        const result = await confirmationResult.confirm(verificationCode);
        const loggedInUser = result.user;

        const userRef = doc(firestore, 'users', loggedInUser.uid);
        const userDoc = await getDoc(userRef);

        if (isRegistering && !userDoc.exists()) {
            // Create profile only on registration if it doesn't exist
            await createUserProfile(loggedInUser.uid, loggedInUser.phoneNumber);
        } else if (!isRegistering && !userDoc.exists()) {
            // If logging in but profile doesn't exist, create it.
            await createUserProfile(loggedInUser.uid, loggedInUser.phoneNumber);
        }

        router.push('/user/me');

    } catch (error: any) {
        console.error("Code verification error:", error);
        toast({ variant: 'destructive', title: 'Verification Failed', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const createUserProfile = async (uid: string, phone: string | null) => {
     if (!firestore) return;

     const counterRef = doc(firestore, 'counters', 'user_id_counter');
     const userRef = doc(firestore, 'users', uid);

     try {
        await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let newNumericId = 1001; // Default starting ID
            if (counterDoc.exists()) {
                newNumericId = (counterDoc.data().currentId || 1000) + 1;
            }
            transaction.set(counterRef, { currentId: newNumericId }, { merge: true });

            const newUser: Partial<AppUser> = {
                id: uid,
                numericId: newNumericId,
                name: `User ${String(newNumericId)}`,
                phoneNumber: phone,
                avatarUrl: `https://picsum.photos/seed/${newNumericId}/200`,
                role: 'user',
                investments: [],
                agentId: null,
                referralId: uid,
                createdAt: serverTimestamp() as any,
                isVerified: false,
                totalDeposit: 0,
            };
            
            if (referralIdFromUrl) {
                const referrerRef = doc(firestore, 'users', referralIdFromUrl);
                const referrerDoc = await getDoc(referrerRef);
                if (referrerDoc.exists()) {
                    newUser.referrerId = referralIdFromUrl;
                }
            }

            transaction.set(userRef, newUser);

            const walletRef = doc(firestore, 'users', uid, 'wallets', 'main');
            const newWallet: Wallet = {
                id: 'main',
                userId: uid,
                balance: 0,
            };
            transaction.set(walletRef, newWallet);
        });
     } catch (e: any) {
        console.error("Transaction failed: ", e);
        throw new Error("Could not create user profile.");
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

  const renderPhoneAuthForm = (isRegistering: boolean) => (
    <div className="space-y-4">
        {!isCodeSent ? (
            <>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="+923001234567" 
                        value={phoneNumber} 
                        onChange={(e) => setPhoneNumber(e.target.value)} 
                    />
                </div>
                <Button onClick={handleSendCode} className="w-full" disabled={isProcessing}>
                    {isProcessing ? 'Sending...' : 'Send Code'}
                </Button>
            </>
        ) : (
            <>
                <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input 
                        id="code" 
                        type="text" 
                        placeholder="Enter 6-digit code" 
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                    />
                </div>
                <Button onClick={() => handleVerifyCode(isRegistering)} className="w-full" disabled={isProcessing}>
                    {isProcessing ? 'Verifying...' : (isRegistering ? 'Register' : 'Login')}
                </Button>
                 <Button variant="link" onClick={() => setIsCodeSent(false)} className="w-full">
                    Change number or resend code
                </Button>
            </>
        )}
        <div id="recaptcha-container"></div>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl p-1 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-center items-center gap-2 mb-6">
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

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="pt-4">
                {renderPhoneAuthForm(false)}
              </TabsContent>
              <TabsContent value="register" className="pt-4">
                {renderPhoneAuthForm(true)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}
