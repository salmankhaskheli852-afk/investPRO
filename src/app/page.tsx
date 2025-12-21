
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, writeBatch, increment, query, where } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import type { User } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// By exporting this, we tell Next.js to always render this page dynamically
// which is required because we are using useSearchParams.
export const dynamic = 'force-dynamic';

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

const FAKE_EMAIL_DOMAIN = 'yourapp.com';

function AuthForm() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const createUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!firestore) return;
    
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        const batch = writeBatch(firestore);
        const name = "User " + firebaseUser.uid.slice(-4);
        const referrerId = searchParams.get('ref') || null;

        batch.set(userRef, {
            id: firebaseUser.uid,
            name: name,
            phoneNumber: `+92${phoneNumber}`,
            avatarUrl: null,
            investments: [],
            createdAt: serverTimestamp(),
            role: 'user',
            referralId: firebaseUser.uid,
            referrerId: referrerId,
            referralCount: 0,
            referralIncome: 0,
            isVerified: false,
            totalDeposit: 0,
        });

        const walletRef = doc(collection(firestore, 'users', firebaseUser.uid, 'wallets'), 'main');
        batch.set(walletRef, {
            id: 'main',
            userId: firebaseUser.uid,
            balance: 0,
        });
        
        if (referrerId) {
            const referrerRef = doc(firestore, 'users', referrerId);
            const referrerDoc = await getDoc(referrerRef);
            if (referrerDoc.exists()) {
                batch.update(referrerRef, { referralCount: increment(1) });
            }
        }
        
        await batch.commit();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !phoneNumber || !password) {
      toast({ variant: 'destructive', title: 'Missing fields' });
      return;
    }
    setIsLoading(true);
    try {
      const email = `+92${phoneNumber}@${FAKE_EMAIL_DOMAIN}`;
      await signInWithEmailAndPassword(auth, email, password);
      // Let LoggedInRedirect handle navigation
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !phoneNumber || !password || !confirmPassword) {
        toast({ variant: 'destructive', title: 'Missing fields' });
        return;
    }
    if (password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Passwords do not match' });
        return;
    }
    setIsLoading(true);
    try {
        const email = `+92${phoneNumber}@${FAKE_EMAIL_DOMAIN}`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user);
        // Let LoggedInRedirect handle navigation
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const renderFormContent = () => {
    if (activeTab === 'login') {
      return (
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-foreground">+92</span>
              <Input
                id="phone-login"
                type="tel"
                placeholder="Please input account number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-20"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password-login"
                type="password"
                placeholder="Please input a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white text-lg h-12">
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      );
    }
    return (
        <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
                 <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-foreground">+92</span>
                    <Input 
                        id="phone-register" 
                        type="tel" 
                        placeholder="Please input account number" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-20"
                        required
                    />
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="password-register" 
                        type="password"
                        placeholder="Please set a password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                    />
                </div>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="confirm-password-register" 
                        type="password"
                        placeholder="Please confirm password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                    />
                </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white text-lg h-12">
                {isLoading ? 'Registering...' : 'Register'}
            </Button>
        </form>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-login-gradient p-4 pt-16 sm:pt-24">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-login-gradient -z-10">
          <div 
              className="absolute inset-0 bg-no-repeat bg-cover opacity-10"
              style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'white\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}
            />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-2 shadow-lg">
                <Image src="https://picsum.photos/seed/bshlogo/80/80" alt="BSH Logo" width={80} height={80} className="rounded-full" data-ai-hint="company logo" />
            </div>
        </div>

        <Card className="w-full shadow-2xl">
          <CardContent className="p-6">
            <div className="flex mb-6 border-b">
              <button
                onClick={() => setActiveTab('login')}
                className={cn(
                  "flex-1 py-3 text-lg font-semibold relative",
                  activeTab === 'login' ? 'text-primary tab-active-border' : 'text-muted-foreground'
                )}
              >
                Log in
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={cn(
                  "flex-1 py-3 text-lg font-semibold relative",
                  activeTab === 'register' ? 'text-primary tab-active-border' : 'text-muted-foreground'
                )}
              >
                Register
              </button>
            </div>
            {renderFormContent()}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function Home() {
  const { user, isUserLoading } = useUser();

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
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm />
    </Suspense>
  )
}
