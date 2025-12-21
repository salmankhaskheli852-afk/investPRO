
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection, query, where, getDocs, DocumentSnapshot, Unsubscribe, WriteBatch } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const FAKE_EMAIL_DOMAIN = 'yourapp.com';

function LoginPageContent() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  
  // Login state
  const [loginPhoneNumber, setLoginPhoneNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register state
  const [registerPhoneNumber, setRegisterPhoneNumber] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isInvitationCodeEditable, setIsInvitationCodeEditable] = useState(true);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setInvitationCode(refCode);
      setIsInvitationCodeEditable(false);
    }
  }, [searchParams]);

  const formatEmailFromPhoneNumber = (phone: string) => {
    let sanitizedPhone = phone.replace(/\s+/g, ''); // remove spaces
    if (sanitizedPhone.startsWith('0')) {
        sanitizedPhone = '+92' + sanitizedPhone.substring(1);
    }
    if (!sanitizedPhone.startsWith('+')) {
        sanitizedPhone = '+' + sanitizedPhone;
    }
    return `${sanitizedPhone}@${FAKE_EMAIL_DOMAIN}`;
  };

  const handleLogin = async () => {
    if (!auth || !loginPhoneNumber || !loginPassword) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please enter your phone number and password.' });
      return;
    }
    setIsProcessing(true);
    const email = formatEmailFromPhoneNumber(loginPhoneNumber);
    try {
      await signInWithEmailAndPassword(auth, email, loginPassword);
      // onAuthStateChanged will handle redirection
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegister = async () => {
    if (!auth || !firestore) return;
    if (!registerPhoneNumber || !registerPassword || !registerConfirmPassword) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill all required fields.' });
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match.' });
      return;
    }
    setIsProcessing(true);
    const email = formatEmailFromPhoneNumber(registerPhoneNumber);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, registerPassword);
      const newUser = userCredential.user;
      
      if (newUser) {
        await createUserProfile(newUser.uid, email, registerPhoneNumber, invitationCode);
      }
      // onAuthStateChanged will handle redirection
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const createUserProfile = async (uid: string, email: string, phoneNumber: string, referrerIdFromInput: string | null) => {
    if (!firestore) return;
    
    let finalReferrerUid: string | null = null;
    
    if (referrerIdFromInput) {
        const numericReferrerId = parseInt(referrerIdFromInput, 10);
        if (!isNaN(numericReferrerId)) {
            const referrerQuery = query(collection(firestore, 'users'), where('numericId', '==', numericReferrerId));
            const referrerSnapshot = await getDocs(referrerQuery);
            if (!referrerSnapshot.empty) {
                const referrerDoc = referrerSnapshot.docs[0];
                if (referrerDoc.id !== uid) {
                    finalReferrerUid = referrerDoc.id;
                }
            }
        }
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const counterRef = doc(firestore, 'counters', 'user_id_counter');
        const userRef = doc(firestore, 'users', uid);
        const walletRef = doc(firestore, 'users', uid, 'wallets', 'main');

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
          phoneNumber: phoneNumber,
          name: `User ${String(newNumericId)}`,
          avatarUrl: `https://picsum.photos/seed/${newNumericId}/200`,
          role: 'user',
          investments: [],
          agentId: null,
          createdAt: serverTimestamp() as any,
          isVerified: false,
          totalDeposit: 0,
        };
        
        if (finalReferrerUid) {
          newUser.referrerId = finalReferrerUid;
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
        } else {
           console.log("User is authenticated but profile document not found.");
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
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone">Phone Number</Label>
                    <Input id="login-phone" type="tel" value={loginPhoneNumber} onChange={e => setLoginPhoneNumber(e.target.value)} placeholder="+92" disabled={isProcessing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} disabled={isProcessing} />
                  </div>
                  <Button onClick={handleLogin} className="w-full" disabled={isProcessing}>
                    {isProcessing ? 'Logging in...' : 'Log In'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Phone Number</Label>
                    <Input id="register-phone" type="tel" value={registerPhoneNumber} onChange={e => setRegisterPhoneNumber(e.target.value)} placeholder="+92" disabled={isProcessing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input id="register-password" type="password" value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} disabled={isProcessing} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input id="register-confirm-password" type="password" value={registerConfirmPassword} onChange={e => setRegisterConfirmPassword(e.target.value)} disabled={isProcessing} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="invitation-code">Invitation Code (Optional)</Label>
                    <Input id="invitation-code" value={invitationCode} onChange={e => setInvitationCode(e.target.value)} placeholder="Code from your inviter" disabled={isProcessing || !isInvitationCodeEditable} />
                  </div>
                  <Button onClick={handleRegister} className="w-full" disabled={isProcessing}>
                    {isProcessing ? 'Registering...' : 'Register'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
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
