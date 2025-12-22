
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
  signInWithEmailAndPassword
} from 'firebase/auth';
import { ShieldCheck, ArrowLeft, Smartphone, Lock, Heart, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateCaptcha } from '@/lib/utils';


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
    const fullPhone = cleanedPhone.startsWith('92') ? `+${cleanedPhone}` : `+92${cleanedPhone}`;
    if(fullPhone.length < 13) return null;
    return `${fullPhone}@investpro.app`;
  }

  const handleRegister = async () => {
    if (!auth || !firestore) return;
    if (!phone || !password || !confirmPassword || !invitationCode || !captchaInput) {
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
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number.' });
      return;
    }
    
    setIsProcessing(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await createUserProfile(newUser, invitationCode, `+92${phone.replace(/\D/g, '')}`);
    } catch (error: any) {
      setCaptchaText(generateCaptcha());
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
        }
      });
    }
  }, [user, isUserLoading, firestore, router]);
  
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
       <div className="flex flex-col items-center justify-center pt-8 pb-12 gap-2">
            <ShoppingBag className="h-16 w-16 text-green-600 bg-white p-3 rounded-2xl shadow-md" />
            <h1 className="font-headline text-4xl font-bold text-slate-800">spf</h1>
       </div>
      
      <Card className="shadow-lg rounded-t-3xl flex-1 p-6">
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
                <Captcha onCaptchaChange={setCaptchaInput} captchaText={captchaText} />
              <Button onClick={handleRegister} className="w-full h-12 text-lg rounded-md" disabled={isProcessing}>
                {isProcessing ? 'Signing up...' : 'Sign Up'}
              </Button>
            </TabsContent>
          </Tabs>
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
