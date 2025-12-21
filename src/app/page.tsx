
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, writeBatch, increment } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import type { User, AdminWallet, WithdrawalMethod, InvestmentPlan } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


// By exporting this, we tell Next.js to always render this page dynamically
// which is required because we are using useSearchParams.
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'salmankhaskheli885@gmail.com';

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


function HomePageContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (!auth) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }, [auth]);

  const handleSendOtp = async () => {
    if (!auth || !window.recaptchaVerifier) return;
    if (!/^\+\d{10,15}$/.test(phoneNumber)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Phone Number',
            description: 'Please enter a valid phone number with country code (e.g., +923001234567).',
        });
        return;
    }
    setIsSendingOtp(true);
    try {
        const result = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        setConfirmationResult(result);
        toast({ title: 'OTP Sent', description: 'Please check your phone for the verification code.' });
    } catch (error) {
        console.error("Error sending OTP:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send OTP. Please try again.' });
    } finally {
        setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) return;
    setIsVerifyingOtp(true);
    try {
        const result = await confirmationResult.confirm(otp);
        await createUserProfile(result.user);
    } catch (error) {
        console.error("Error verifying OTP:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid OTP. Please try again.' });
    } finally {
        setIsVerifyingOtp(false);
    }
  };


  const createUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!firestore) return;
    
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        const batch = writeBatch(firestore);
        // For phone auth, email is null. Let's make a default name.
        const defaultName = "User " + firebaseUser.uid.slice(-4);

        const referrerId = searchParams.get('ref') || null;

        // 1. Create the new user's profile
        batch.set(userRef, {
            id: firebaseUser.uid,
            name: defaultName,
            phoneNumber: firebaseUser.phoneNumber,
            avatarUrl: null,
            investments: [],
            createdAt: serverTimestamp(),
            role: 'user', // Default role
            referralId: firebaseUser.uid,
            referrerId: referrerId,
            referralCount: 0,
            referralIncome: 0,
            isVerified: false,
            totalDeposit: 0,
        });

        // 2. Create the user's wallet
        const walletRef = doc(collection(firestore, 'users', firebaseUser.uid, 'wallets'), 'main');
        batch.set(walletRef, {
            id: 'main',
            userId: firebaseUser.uid,
            balance: 0,
        });
        
        // 3. If there was a referrer, update their count
        if (referrerId) {
            const referrerRef = doc(firestore, 'users', referrerId);
            const referrerDoc = await getDoc(referrerRef);
            if (referrerDoc.exists()) {
                batch.update(referrerRef, { referralCount: increment(1) });
            }
        }
        
        await batch.commit();
    } else {
        const referrerId = searchParams.get('ref') || null;
        if (referrerId) {
            const existingUserData = userDoc.data() as User;
            if (!existingUserData.referrerId) {
                const batch = writeBatch(firestore);
                batch.update(userRef, { referrerId: referrerId });
                const referrerRef = doc(firestore, 'users', referrerId);
                const referrerDoc = await getDoc(referrerRef);
                if (referrerDoc.exists()) {
                    batch.update(referrerRef, { referralCount: increment(1) });
                }
                await batch.commit();
            }
        }
    }
};

  
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <div id="recaptcha-container"></div>
      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <h1 className="font-headline text-4xl font-bold text-primary">investPro</h1>
          <CardDescription className="pt-2">Your trusted partner in modern investments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!confirmationResult ? (
            <div className="space-y-4">
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
              <Button onClick={handleSendOtp} disabled={isSendingOtp} className="w-full">
                {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </div>
          ) : (
             <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input 
                  id="otp" 
                  type="text"
                  placeholder="Enter 6-digit code" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <Button onClick={handleVerifyOtp} disabled={isVerifyingOtp} className="w-full">
                {isVerifyingOtp ? 'Verifying...' : 'Sign In'}
              </Button>
              <Button variant="link" onClick={() => setConfirmationResult(null)}>
                Change phone number
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground pt-4">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Reliable</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-primary" />
            <span>Community</span>
          </div>
        </CardFooter>
      </Card>
      </div>
    </main>
  );
}


export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
