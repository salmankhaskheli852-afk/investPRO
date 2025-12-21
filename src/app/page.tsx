'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, Lock } from 'lucide-react';

const DUMMY_DOMAIN = 'investpro.app';

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const referralIdFromUrl = searchParams.get('ref');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const formatEmail = (phone: string) => `${phone.replace(/\D/g, '')}@${DUMMY_DOMAIN}`;

  const handleLogin = async () => {
      if (!auth) return toast({ variant: 'destructive', title: 'Auth not ready' });
      if (!phoneNumber || !password) return toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter phone and password.' });
      
      setIsProcessing(true);
      const email = formatEmail(phoneNumber);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/user/me');
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

    setIsProcessing(true);
    const email = formatEmail(phoneNumber);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const loggedInUser = userCredential.user;
        await createUserProfile(loggedInUser.uid, phoneNumber);
        router.push('/user/me');
    } catch (error: any) {
        console.error("Registration error:", error);
        toast({ variant: 'destructive', title: 'Registration Failed', description: error.code === 'auth/email-already-in-use' ? 'This phone number is already registered.' : error.message });
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
                name: `User ${String(uid).slice(-4)}`,
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
      const isAdminOrAgent = user.email?.endsWith(`@${DUMMY_DOMAIN}`);
      const path = isAdminOrAgent ? '/user/me' : '/user/me';
      router.push(path);
    }
  }, [user, isUserLoading, router]);
  
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
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <span className="pl-2 pr-1 text-sm text-muted-foreground">+92</span>
                </div>
                <Input 
                    id="login-phone" 
                    type="tel" 
                    placeholder="3112765988" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    className="pl-[68px]"
                />
            </div>
        </div>
        <div className="space-y-2">
             <Label htmlFor="login-password" className="sr-only">Password</Label>
             <Input 
                id="login-password"
                type="password"
                placeholder="••••••••••"
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
             <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <span className="pl-2 pr-1 text-sm text-muted-foreground">+92</span>
                </div>
                <Input 
                    id="register-phone" 
                    type="tel" 
                    placeholder="3112765988" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    className="pl-[68px]"
                />
            </div>
        </div>
        <div className="space-y-2">
             <Label htmlFor="register-password" className="sr-only">Password</Label>
             <Input 
                id="register-password"
                type="password"
                placeholder="Enter your password"
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
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
             />
        </div>
        <Button onClick={handleRegister} className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-lg" disabled={isProcessing}>
            {isProcessing ? 'Registering...' : 'Register'}
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
