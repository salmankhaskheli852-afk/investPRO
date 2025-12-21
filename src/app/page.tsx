'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, Lock, Heart, ShieldCheck, RefreshCcw } from 'lucide-react';

const DUMMY_DOMAIN = 'investpro.app';

// Simple CAPTCHA component
const CaptchaDisplay = ({ code }: { code: string }) => (
    <div className="flex items-center justify-center bg-gray-200 rounded-md p-2">
        <span className="text-2xl font-bold tracking-[.2em] text-gray-700" style={{ textDecoration: 'line-through', fontStyle: 'italic' }}>
            {code}
        </span>
    </div>
);

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  // Common state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Registration specific state
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  const generateCaptcha = () => {
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCaptcha(randomCode);
  };
  
  useEffect(() => {
    generateCaptcha();
  }, []);

  const formatEmail = (phone: string) => `${phone.replace(/\D/g, '')}@${DUMMY_DOMAIN}`;

  const handleLogin = async () => {
      if (!auth) return toast({ variant: 'destructive', title: 'Auth not ready' });
      if (!phoneNumber || !password) return toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter phone and password.' });
      
      setIsProcessing(true);
      const email = formatEmail(phoneNumber);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // On successful login, the useEffect for user state change will handle redirection
      } catch (error: any) {
        console.error("Login error:", error);
        toast({ variant: 'destructive', title: 'Login Failed', description: error.code === 'auth/invalid-credential' ? 'Invalid phone number or password.' : error.message });
      } finally {
        setIsProcessing(false);
      }
  };
  
  const handleRegister = async () => {
    if (!auth || !firestore) return toast({ variant: 'destructive', title: 'System not ready' });
    if (!phoneNumber || !password || !confirmPassword) return toast({ variant: 'destructive', title: 'Missing fields' });
    if (password !== confirmPassword) return toast({ variant: 'destructive', title: 'Passwords do not match' });
    if (captchaInput.toUpperCase() !== captcha) {
        generateCaptcha();
        return toast({ variant: 'destructive', title: 'Verification Failed', description: 'The verification code is incorrect.' });
    }

    setIsProcessing(true);
    const email = formatEmail(phoneNumber);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const loggedInUser = userCredential.user;
        await createUserProfile(loggedInUser.uid, phoneNumber, invitationCode);
        // On successful registration, the useEffect for user state change will handle redirection
    } catch (error: any) {
        console.error("Registration error:", error);
        toast({ variant: 'destructive', title: 'Registration Failed', description: error.code === 'auth/email-already-in-use' ? 'This phone number is already registered.' : error.message });
        generateCaptcha();
    } finally {
        setIsProcessing(false);
    }
  };

  const createUserProfile = async (uid: string, phone: string, referrerIdFromInput: string | null) => {
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
                name: `User ${String(uid).slice(-4)}`,
                phoneNumber: `+92${phone}`,
                avatarUrl: `https://picsum.photos/seed/${newNumericId}/200`,
                role: 'user',
                investments: [],
                agentId: null,
                referralId: uid,
                createdAt: serverTimestamp() as any,
                isVerified: false,
                totalDeposit: 0,
            };
            
            // Check if referrer exists before setting
            if (referrerIdFromInput) {
                const referrerRef = doc(firestore, 'users', referrerIdFromInput);
                const referrerDoc = await transaction.get(referrerRef);
                if (referrerDoc.exists()) {
                    newUser.referrerId = referrerIdFromInput;
                } else {
                    console.warn(`Referrer with ID ${referrerIdFromInput} not found.`);
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
        // Fetch user role from Firestore to decide redirection
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
                // Fallback if doc doesn't exist yet, might happen on first login
                router.push('/user/me');
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

  const renderLoginForm = () => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="login-phone" className="sr-only">Phone Number</Label>
            <Input 
                id="login-phone" 
                type="tel" 
                placeholder="Please enter mobile account" 
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
             <Label htmlFor="login-password" className="sr-only">Password</Label>
             <Input 
                id="login-password"
                type="password"
                placeholder="Please input password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
             />
        </div>
        <Button onClick={handleLogin} className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-lg" disabled={isProcessing}>
            {isProcessing ? 'Logging in...' : 'Log in'}
        </Button>
    </div>
  );

  const renderRegisterForm = () => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="register-phone" className="sr-only">Phone Number</Label>
             <Input 
                id="register-phone" 
                type="tel" 
                placeholder="Please enter mobile account" 
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
             <Label htmlFor="register-password" className="sr-only">Password</Label>
             <Input 
                id="register-password"
                type="password"
                placeholder="Please input password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
             />
        </div>
        <div className="space-y-2">
             <Label htmlFor="register-confirm-password" className="sr-only">Confirm Password</Label>
             <Input 
                id="register-confirm-password"
                type="password"
                placeholder="Please enter password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
             />
        </div>
         <div className="space-y-2">
             <Label htmlFor="register-invitation-code" className="sr-only">Invitation Code</Label>
             <Input 
                id="register-invitation-code"
                type="text"
                placeholder="Please enter the invitation code"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                icon={<Heart className="h-5 w-5 text-muted-foreground" />}
             />
        </div>
        <div className="space-y-2">
            <Label htmlFor="register-captcha" className="sr-only">Verification Code</Label>
            <div className="flex items-center gap-2">
                 <Input 
                    id="register-captcha"
                    type="text"
                    placeholder="Verification code"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    icon={<ShieldCheck className="h-5 w-5 text-muted-foreground" />}
                 />
                 <CaptchaDisplay code={captcha} />
                 <Button variant="ghost" size="icon" onClick={generateCaptcha}>
                    <RefreshCcw className="h-5 w-5 text-muted-foreground" />
                 </Button>
            </div>
        </div>
        <Button onClick={handleRegister} className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-lg" disabled={isProcessing}>
            {isProcessing ? 'Registering...' : 'Sign up'}
        </Button>
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
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 mb-4">
                <TabsTrigger value="login" className="text-lg text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent relative data-[state=active]:font-bold after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform">
                    Log in
                </TabsTrigger>
                <TabsTrigger value="register" className="text-lg text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent relative data-[state=active]:font-bold after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform">
                    Register
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="pt-4">
                {renderLoginForm()}
              </TabsContent>
              <TabsContent value="register" className="pt-4">
                {renderRegisterForm()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
