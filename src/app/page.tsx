
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, ShieldCheck } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');

  // The reCAPTCHA is now initialized on-demand within handleSendOtp
  // to prevent race conditions. The useEffect is no longer needed for this.

  const handleSendOtp = async () => {
    if (!auth) return toast({ variant: 'destructive', title: 'Auth not ready' });
    if (!phoneNumber) return toast({ variant: 'destructive', title: 'Missing phone number' });

    setIsProcessing(true);
    try {
      const formattedPhoneNumber = `+92${phoneNumber.replace(/^0+/, '')}`;
      
      // Initialize reCAPTCHA verifier on demand
      if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'invisible',
              'callback': (response: any) => {
                  // reCAPTCHA solved.
              }
          });
      }
      
      const verifier = window.recaptchaVerifier;
      // Render the reCAPTCHA widget and wait for it to be ready
      await verifier.render();

      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, verifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: 'Please check your phone for the verification code.' });

    } catch (error: any) {
      console.error("OTP send error:", error);
      toast({ variant: 'destructive', title: 'Failed to Send OTP', description: error.message });
       // Reset reCAPTCHA on error to allow retries.
       // The verifier might not be attached to window if it fails, so check first.
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear(); // Clear the instance
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!window.confirmationResult) return toast({ variant: 'destructive', title: 'Verification failed', description: 'Please send OTP first.' });
    if (!otp) return toast({ variant: 'destructive', title: 'Missing OTP' });

    setIsProcessing(true);
    try {
      const userCredential = await window.confirmationResult.confirm(otp);
      const loggedInUser = userCredential.user;
      
      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await createUserProfile(loggedInUser.uid, loggedInUser.phoneNumber!, invitationCode);
      }
      
      // On successful verification, the useEffect for user state change will handle redirection.
    } catch (error: any)
      {
      console.error("OTP verification error:", error);
      toast({ variant: 'destructive', title: 'Verification Failed', description: 'The OTP is incorrect or has expired.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const createUserProfile = async (uid: string, phone: string, referrerIdFromInput: string | null) => {
     if (!firestore) return;

     const counterRef = doc(firestore, 'counters', 'user_id_counter');
     const userRef = doc(firestore, 'users', uid);
     const walletRef = doc(firestore, 'users', uid, 'wallets', 'main');

     try {
        await runTransaction(firestore, async (transaction) => {
            let referrerValid = false;
            let referrerDoc;
            if (referrerIdFromInput) {
                // Check if referrer is a numeric ID or a UID
                let referrerQuery;
                const numericReferrerId = parseInt(referrerIdFromInput, 10);
                if (!isNaN(numericReferrerId)) {
                    referrerQuery = query(collection(firestore, 'users'), where('numericId', '==', numericReferrerId));
                } else {
                    referrerQuery = query(collection(firestore, 'users'), where('id', '==', referrerIdFromInput));
                }
                const referrerSnapshot = await getDocs(referrerQuery);
                if (!referrerSnapshot.empty) {
                    referrerValid = true;
                    referrerDoc = referrerSnapshot.docs[0];
                }
            }


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
                referralId: uid, // User's own referral ID
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
                console.log("User authenticated but no profile found, might be a new registration.");
            }
        });
    }
  }, [user, isUserLoading, router, firestore]);
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const renderForm = () => (
    <div className="space-y-4">
        {!otpSent ? (
            <>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="3001234567" 
                        value={phoneNumber} 
                        onChange={(e) => setPhoneNumber(e.target.value)} 
                        icon={
                            <div className="flex items-center gap-1">
                                <Smartphone className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">+92</span>
                            </div>
                        }
                        className="pl-20"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invitation-code">Invitation Code (Optional)</Label>
                    <Input 
                        id="invitation-code" 
                        type="text" 
                        placeholder="Enter referrer's code"
                        value={invitationCode} 
                        onChange={(e) => setInvitationCode(e.target.value)} 
                    />
                </div>
                <Button onClick={handleSendOtp} className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-lg" disabled={isProcessing}>
                    {isProcessing ? 'Sending...' : 'Send OTP'}
                </Button>
            </>
        ) : (
             <>
                <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input 
                        id="otp"
                        type="text"
                        placeholder="Enter the 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        icon={<ShieldCheck className="h-5 w-5 text-muted-foreground" />}
                        maxLength={6}
                    />
                </div>
                <Button onClick={handleVerifyOtp} className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-lg" disabled={isProcessing}>
                    {isProcessing ? 'Verifying...' : 'Verify OTP & Continue'}
                </Button>
                <Button variant="link" onClick={() => setOtpSent(false)}>
                    Entered wrong number?
                </Button>
            </>
        )}
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div id="recaptcha-container"></div>
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

            <div className="pt-4">
                {renderForm()}
            </div>
          
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
