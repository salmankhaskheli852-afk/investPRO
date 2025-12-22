
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
  User as FirebaseAuthUser, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { ShieldCheck, ArrowLeft, Smartphone, Lock, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateCaptcha } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


// CAPTCHA Component
const Captcha = ({ onCaptchaChange, captchaText }: { onCaptchaChange: (text: string) => void; captchaText: string; }) => {
    return (
        <div className="flex items-center justify-between rounded-md border border-input pl-3">
            <ShieldCheck className="text-muted-foreground mr-3" />
            <input
                type="text"
                placeholder="Verification code"
                onChange={(e) => onCaptchaChange(e.target.value)}
                className="flex-grow h-10 bg-transparent text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
            <div 
                className="captcha-image text-lg font-bold tracking-widest p-2"
                style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='100' height='40'%3e%3ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='black' transform='rotate(0 50 20)'%3e${captchaText}%3c/text%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '100px',
                    height: '40px',
                    letterSpacing: '2px',
                    userSelect: 'none',
                }}
            >
            </div>
        </div>
    );
};

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.28-7.962l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,34.556,44,29.666,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

function LoginPageContent() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('register');

  // Register state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isRefCodeFromUrl, setIsRefCodeFromUrl] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaText, setCaptchaText] = useState('');

  // Login state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  useEffect(() => {
    setCaptchaText(generateCaptcha());
  }, []);


  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setInvitationCode(refCode);
      setIsRefCodeFromUrl(true);
    }
  }, [searchParams]);

  const formatPhoneAsEmail = (phone: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) return null;
    const phoneDigits = cleanedPhone.slice(-10);
    return `+92${phoneDigits}@investpro.app`;
  }

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
          const ref = searchParams.get('ref');
          await createUserProfile(user, ref, null);
      }
      
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };


  const handleRegister = async () => {
    if (!auth || !firestore) return;
    if (!phone || !password || !confirmPassword || !captchaInput) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
     if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
      toast({ variant: 'destructive', title: 'Invalid CAPTCHA', description: 'The verification code is incorrect.' });
      setCaptchaText(generateCaptcha()); // Refresh CAPTCHA
      return;
    }

    const email = formatPhoneAsEmail(phone);
    if (!email) {
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid 10-digit phone number (e.g., 3001234567).' });
      return;
    }
    
    setIsProcessing(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await createUserProfile(newUser, invitationCode, `+92${phone.replace(/\D/g, '').slice(-10)}`);
    } catch (error: any) {
      setCaptchaText(generateCaptcha());
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: 'destructive', title: 'Registration Failed', description: 'This phone number is already registered.' });
      } else if (error.code === 'auth/operation-not-allowed') {
         toast({ variant: 'destructive', title: 'Registration Failed', description: 'Email/Password sign-in is not enabled. Please contact support.' });
      }
      else {
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
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid phone number or password.' });
    } finally {
      setIsProcessing(false);
    }
  }

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
           // This can happen if profile creation fails after registration
           // or if a user signs in with Google for the first time
           const ref = searchParams.get('ref');
           createUserProfile(user, ref, user.phoneNumber).catch(() => {
             // Handle profile creation error on first Google sign-in
             toast({ variant: 'destructive', title: 'Setup Failed', description: 'Could not create your user profile. Please try again.' });
           });
        }
      });
    }
  }, [user, isUserLoading, firestore, router, searchParams, toast]);
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-login-gradient">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-login-gradient p-4">
       <div className="flex items-center h-20 gap-2">
            <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="investPro Logo" width={48} height={48} />
                <span className="font-headline text-3xl font-semibold text-white">investPro</span>
            </Link>
       </div>
      
      <Card className="shadow-lg rounded-t-3xl flex-1 p-6 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-md">
              <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Log in</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-8 space-y-6">
              <Input 
                icon={<Smartphone className="text-muted-foreground" />} 
                type="tel"
                prefix="+92"
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
                    prefix="+92"
                    placeholder="Enter 10-digit mobile number"
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
                    placeholder="Invitation Code (Optional)"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    disabled={isRefCodeFromUrl}
                />
                <Captcha onCaptchaChange={setCaptchaInput} captchaText={captchaText} />
              <Button onClick={handleRegister} className="w-full h-12 text-lg rounded-md" disabled={isProcessing}>
                {isProcessing ? 'Signing up...' : 'Sign Up'}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <div className="relative">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card/80 px-2 text-sm text-muted-foreground">OR</span>
            </div>
             <Button variant="outline" className="w-full h-12 text-base" onClick={handleGoogleSignIn} disabled={isProcessing}>
                <GoogleIcon className="mr-2" />
                Sign in with Google
            </Button>
          </div>
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
