
'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  User as FirebaseAuthUser, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { ShieldCheck, TrendingUp, Users, Copy, Gift, ArrowLeft, Smartphone, Lock, Heart } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  const [activeTab, setActiveTab] = useState('register');

  // Register state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');


  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setInvitationCode(refCode);
      setIsRefCodeFromUrl(true);
    }
  }, [searchParams]);

  // Helper to format phone number to a valid email for Firebase Auth
  const formatPhoneAsEmail = (phone: string) => {
    // Remove all non-digit characters and ensure it starts with '+'
    const cleanedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
    if(cleanedPhone.length < 10) return null; // Basic validation
    return `${cleanedPhone}@investpro.app`; // Using a dummy domain
  }

  const handleRegister = async () => {
    if (!auth || !firestore) return;
    if (!phone || !password || !confirmPassword) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }

    const email = formatPhoneAsEmail(phone);
    if (!email) {
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number with country code.' });
      return;
    }
    
    setIsProcessing(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await createUserProfile(newUser, invitationCode, phone);
      // Redirection will be handled by useEffect
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: 'destructive', title: 'Registration Failed', description: 'This phone number is already registered.' });
      } else {
        toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) return;
     if (!loginPhone || !loginPassword) {
      toast({ variant: 'destructive', title: 'Missing fields' });
      return;
    }
    const email = formatPhoneAsEmail(loginPhone);
    if (!email) {
       toast({ variant: 'destructive', title: 'Invalid Phone Number' });
       return;
    }
    
    setIsProcessing(true);
    try {
      await signInWithEmailAndPassword(auth, email, loginPassword);
      // Redirection will be handled by useEffect
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid phone number or password.' });
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
        await createUserProfile(googleUser, invitationCode, null);
      }
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
        email: user.email || formatPhoneAsEmail(phoneNumber || '') || '',
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
            setTimeout(() => {
                 getDoc(userDocRef).then(async (snap) => {
                     if (!snap.exists()) {
                         if (user.providerData[0].providerId === 'phone' || user.providerData[0].providerId === 'password') {
                             await createUserProfile(user, invitationCode, user.phoneNumber || phone);
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
  }, [user, isUserLoading, firestore, router, invitationCode, phone]);
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-login-gradient">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-login-gradient p-4">
       <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
       </div>
       <div className="flex flex-col items-center justify-center pt-8 pb-12">
            <Image src="/logo.png" alt="investPro Logo" width={80} height={80} />
            <h1 className="font-headline text-4xl font-bold text-primary mt-2">investPro</h1>
       </div>
      
      <Card className="shadow-lg rounded-t-3xl flex-1 p-6">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="text-lg">Log in</TabsTrigger>
              <TabsTrigger value="register" className="text-lg">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-8 space-y-6">
              <Input 
                icon={<Smartphone className="text-muted-foreground" />} 
                type="tel" 
                placeholder="Please enter mobile account"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
              />
              <Input 
                icon={<Lock className="text-muted-foreground" />} 
                type="password" 
                placeholder="Please input password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <Button onClick={handleLogin} className="w-full h-12 text-lg rounded-full" disabled={isProcessing}>
                {isProcessing ? 'Logging in...' : 'Log In'}
              </Button>
            </TabsContent>
            <TabsContent value="register" className="mt-8 space-y-6">
                <Input 
                    icon={<Smartphone className="text-muted-foreground" />} 
                    type="tel" 
                    placeholder="Please enter mobile account"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                <Input 
                    icon={<Lock className="text-muted-foreground" />} 
                    type="password" 
                    placeholder="Please input password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                />
                 <Input 
                    icon={<Lock className="text-muted-foreground" />} 
                    type="password" 
                    placeholder="Please enter password again" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Input 
                    icon={<Heart className="text-muted-foreground" />} 
                    type="text" 
                    placeholder="Please enter the invitation code"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    disabled={isRefCodeFromUrl}
                />
              <Button onClick={handleRegister} className="w-full h-12 text-lg rounded-full" disabled={isProcessing}>
                {isProcessing ? 'Signing up...' : 'Sign Up'}
              </Button>
            </TabsContent>
          </Tabs>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
            </div>
            
            <Button onClick={handleGoogleSignIn} variant="outline" className="w-full h-12 text-base rounded-full" disabled={isProcessing}>
                <Image src="/google-logo.svg" alt="Google" width={24} height={24} className="mr-2" />
                Sign in with Google
            </Button>
        </CardContent>
      </Card>
    </main>
  );
}


export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-login-gradient"><p>Loading...</p></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
