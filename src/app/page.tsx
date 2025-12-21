
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as AppUser, Wallet } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, ShieldCheck, Lock, Heart, User as UserIcon } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

export default function Home() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('login');
  
  // Login State
  const [loginPhoneNumber, setLoginPhoneNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [regPhoneNumber, setRegPhoneNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regInvitationCode, setRegInvitationCode] = useState('');
  const [regVerificationCode, setRegVerificationCode] = useState('');

  const [captchaCode, setCaptchaCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    generateCaptcha();
  }, []);
  
  const generateCaptcha = () => {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setCaptchaCode(code);
  };
  
  const formatEmailFromPhone = (phone: string) => {
    const formattedPhone = `+92${phone.replace(/^0+/, '')}`;
    return `${formattedPhone}@investpro.com`;
  }
  
  const handleRegister = async () => {
    if (!auth || !firestore) return;
    if (!regPhoneNumber || !regPassword || !regConfirmPassword) {
      return toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all required fields.' });
    }
    if (regPassword !== regConfirmPassword) {
      return toast({ variant: 'destructive', title: 'Passwords do not match' });
    }
    if (regVerificationCode !== captchaCode) {
      generateCaptcha();
      return toast({ variant: 'destructive', title: 'Invalid verification code' });
    }

    setIsProcessing(true);
    const fakeEmail = formatEmailFromPhone(regPhoneNumber);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, regPassword);
      const newUser = userCredential.user;
      
      await createUserProfile(newUser.uid, `+92${regPhoneNumber.replace(/^0+/, '')}`, regInvitationCode);
      // Let the useEffect handle redirection
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This phone number is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      toast({ variant: 'destructive', title: 'Registration Failed', description: message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) return;
    if (!loginPhoneNumber || !loginPassword) {
      return toast({ variant: 'destructive', title: 'Missing fields' });
    }
    setIsProcessing(true);
    const fakeEmail = formatEmailFromPhone(loginPhoneNumber);
    try {
      await signInWithEmailAndPassword(auth, fakeEmail, loginPassword);
      // Let the useEffect handle redirection
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Login Failed', description: 'Incorrect phone number or password.' });
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
                referralId: uid,
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

  const renderLoginTab = () => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="phone-login">Phone Number</Label>
            <div className="relative">
                <Input 
                    id="phone-login" 
                    type="tel" 
                    placeholder="3001234567" 
                    value={loginPhoneNumber} 
                    onChange={(e) => setLoginPhoneNumber(e.target.value)}
                    className="pl-12"
                    icon={<Smartphone className="h-5 w-5 text-muted-foreground" />}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+92</span>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="password-login">Password</Label>
            <Input 
                id="password-login" 
                type="password" 
                placeholder="Enter your password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            />
        </div>
        <Button onClick={handleLogin} className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-lg" disabled={isProcessing}>
            {isProcessing ? 'Logging in...' : 'Log In'}
        </Button>
    </div>
  );

 const renderRegisterTab = () => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="phone-reg">Phone Number</Label>
            <div className="relative">
                <Input 
                    id="phone-reg" 
                    type="tel" 
                    placeholder="3001234567" 
                    value={regPhoneNumber} 
                    onChange={(e) => setRegPhoneNumber(e.target.value)} 
                    className="pl-12"
                    icon={<Smartphone className="h-5 w-5 text-muted-foreground" />}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+92</span>
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="password-reg">Create Password</Label>
            <Input 
                id="password-reg" 
                type="password" 
                placeholder="Must be at least 6 characters"
                value={regPassword} 
                onChange={(e) => setRegPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="confirm-password-reg">Confirm Password</Label>
            <Input 
                id="confirm-password-reg" 
                type="password" 
                placeholder="Re-enter your password"
                value={regConfirmPassword} 
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                icon={<Lock className="h-5 w-5 text-muted-foreground" />}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="invitation-code">Invitation Code (Optional)</Label>
            <Input 
                id="invitation-code" 
                type="text" 
                placeholder="Enter referrer's code"
                value={regInvitationCode} 
                onChange={(e) => setRegInvitationCode(e.target.value)}
                icon={<Heart className="h-5 w-5 text-muted-foreground" />}
            />
        </div>
        <div className="flex items-end gap-2">
            <div className="space-y-2 flex-grow">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input 
                    id="verification-code" 
                    type="text"
                    value={regVerificationCode} 
                    onChange={(e) => setRegVerificationCode(e.target.value)} 
                    icon={<ShieldCheck className="h-5 w-5 text-muted-foreground" />}
                    maxLength={4}
                />
            </div>
            <div 
                className="h-10 px-4 py-2 border rounded-md bg-muted select-none flex items-center justify-center font-mono text-lg tracking-widest"
                onClick={generateCaptcha}
                title="Click to refresh"
            >
                {captchaCode}
            </div>
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

            <div className="flex mb-4 border-b">
                <button
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2 text-center text-lg font-semibold relative ${activeTab === 'login' ? 'text-primary tab-active-border' : 'text-muted-foreground'}`}
                >
                    Log in
                </button>
                <button
                    onClick={() => setActiveTab('register')}
                    className={`flex-1 py-2 text-center text-lg font-semibold relative ${activeTab === 'register' ? 'text-primary tab-active-border' : 'text-muted-foreground'}`}
                >
                    Register
                </button>
            </div>

            <div className="pt-4">
                {activeTab === 'login' ? renderLoginTab() : renderRegisterTab()}
            </div>
          
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

    