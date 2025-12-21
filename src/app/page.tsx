
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, writeBatch, increment, query, where, runTransaction, getDocs, addDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { User, PasswordResetRequest } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Lock, Heart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

function ForgotPasswordDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleSubmitRequest = async () => {
        if (!firestore) return;
        if (!phoneNumber || !newPassword || !confirmPassword) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all fields.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Passwords do not match' });
            return;
        }
        setIsLoading(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('phoneNumber', '==', `+92${phoneNumber}`));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("No user found with this phone number.");
            }
            const userDoc = querySnapshot.docs[0];

            const requestData: Omit<PasswordResetRequest, 'id'> = {
                userId: userDoc.id,
                userName: userDoc.data().name,
                userPhoneNumber: userDoc.data().phoneNumber,
                newPassword, // Storing in plain text as requested by admin-view requirement
                status: 'pending',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(firestore, 'password_reset_requests'), requestData);

            toast({ title: 'Request Submitted', description: 'Your password reset request has been sent to the admin for approval.' });
            setIsOpen(false);
            setPhoneNumber('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Request Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="link" className="px-0 h-auto text-xs">Forgot password?</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reset Your Password</DialogTitle>
                    <DialogDescription>
                        Enter your phone number and new password. Your request will be sent to an administrator for approval.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-foreground">+92</span>
                      <Input
                        id="phone-forgot"
                        type="tel"
                        placeholder="Your registered mobile number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-20"
                        required
                      />
                    </div>
                     <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="new-password-forgot"
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pl-10"
                            required
                        />
                    </div>
                     <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="confirm-password-forgot"
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10"
                            required
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmitRequest} disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AuthForm() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < 6; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(randomString);
  };
  
  useEffect(() => {
    // Generate captcha when the component mounts or tab switches to register
    if (activeTab === 'register') {
      generateCaptcha();
    }
  }, [activeTab]);

  useEffect(() => {
    // Prefill invitation code from URL if present
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      setInvitationCode(refFromUrl);
    }
  }, [searchParams]);
  
  const createUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!firestore) return;
  
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const counterRef = doc(firestore, 'counters', 'user_id_counter');
  
    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          // User profile already exists, do nothing.
          return;
        }
  
        // Get and increment the numeric ID counter
        const counterDoc = await transaction.get(counterRef);
        let nextNumericId = 10000;
        if (counterDoc.exists()) {
          nextNumericId = counterDoc.data().currentId + 1;
        } else {
           nextNumericId = 10001; // Start from 10001 if counter doesn't exist
        }
        transaction.set(counterRef, { currentId: nextNumericId }, { merge: true });
  
        const name = "User " + firebaseUser.uid.slice(-4);
        const referrerId = invitationCode || null;
  
        const newUserProfile: Omit<User, 'createdAt' | 'investments'> & { createdAt: any } = {
          id: firebaseUser.uid,
          numericId: nextNumericId,
          name: name,
          phoneNumber: `+92${phoneNumber}`,
          role: 'user',
          referralId: firebaseUser.uid,
          referrerId: referrerId,
          referralCount: 0,
          referralIncome: 0,
          isVerified: false,
          totalDeposit: 0,
          createdAt: serverTimestamp(),
        };
  
        transaction.set(userRef, newUserProfile);
  
        const walletRef = doc(collection(firestore, 'users', firebaseUser.uid, 'wallets'), 'main');
        transaction.set(walletRef, {
          id: 'main',
          userId: firebaseUser.uid,
          balance: 0,
        });
  
        if (referrerId) {
          // In a real app, you'd look up the referrer by their user-facing ID, not UID.
          // Assuming invitationCode is the numericId of the referrer
          const referrerUserQuery = query(collection(firestore, 'users'), where('numericId', '==', parseInt(referrerId, 10)));
          const referrerSnapshot = await getDocs(referrerUserQuery);
          if (!referrerSnapshot.empty) {
            const referrerDoc = referrerSnapshot.docs[0];
            transaction.update(referrerDoc.ref, { referralCount: increment(1) });
          } else {
            console.warn(`Referrer with numericId ${referrerId} not found.`);
          }
        }
      });
    } catch (error) {
      console.error("Transaction failed: ", error);
      throw error; // Re-throw to be caught by the calling function
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
      toast({ variant: 'destructive', title: 'Login Failed', description: "Invalid phone number or password." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !phoneNumber || !password || !confirmPassword || !userCaptcha) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all the fields.' });
        return;
    }
    if (password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Passwords do not match' });
        return;
    }
    if (userCaptcha.toLowerCase() !== captcha.toLowerCase()) {
        toast({ variant: 'destructive', title: 'Invalid Verification Code', description: 'Please check the code and try again.' });
        generateCaptcha(); // Regenerate captcha
        setUserCaptcha('');
        return;
    }

    setIsLoading(true);
    try {
        const email = `+92${phoneNumber}@${FAKE_EMAIL_DOMAIN}`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user);
        // Let LoggedInRedirect handle navigation
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Registration Failed', description: error.code === 'auth/email-already-in-use' ? 'This phone number is already registered.' : error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.role === 'agent') {
          router.push('/agent');
        } else {
          // User exists but is not an admin or agent
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You are not an administrator or agent. Please log in with your phone number.',
          });
        }
      } else {
        // New user trying to log in via Google
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Registration Required',
          description: 'This email is not registered. Please log in with your phone number.',
        });
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        variant: 'destructive',
        title: 'Admin Login Failed',
        description: 'Could not log in with Google. Please try again.',
      });
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
                placeholder="Please enter mobile account"
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
           <div className="text-right">
              <ForgotPasswordDialog />
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
                        placeholder="Please enter mobile account" 
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
                        placeholder="Please input password" 
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
                        placeholder="Please enter password again" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                    />
                </div>
                <div className="relative">
                    <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="invitation-code" 
                        type="text"
                        placeholder="Invitation Code (Optional)" 
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="relative flex items-center gap-2">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                      id="captcha-input" 
                      type="text"
                      placeholder="Verification code" 
                      value={userCaptcha}
                      onChange={(e) => setUserCaptcha(e.target.value)}
                      className="pl-10"
                      required
                  />
                  <div 
                    onClick={generateCaptcha} 
                    className="cursor-pointer select-none rounded-md border bg-gray-200 px-3 py-1 font-mono text-xl tracking-widest text-gray-700"
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontStyle: 'italic',
                      textDecoration: 'line-through',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'30\'%3E%3Cpath d=\'M10 15 Q 30 5, 50 15 T 90 15\' stroke=\'rgba(0,0,0,0.2)\' fill=\'transparent\'/%3E%3C/svg%3E")',
                    }}
                  >
                    {captcha}
                  </div>
                </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white text-lg h-12">
                {isLoading ? 'Registering...' : 'Sign up'}
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
          <CardContent className="p-6 pb-2">
            <div className="flex mb-6 border-b">
              <button
                onClick={() => { setActiveTab('login'); setPhoneNumber(''); setPassword(''); setConfirmPassword(''); }}
                className={cn(
                  "flex-1 py-3 text-lg font-semibold relative",
                  activeTab === 'login' ? 'text-primary tab-active-border' : 'text-muted-foreground'
                )}
              >
                Log in
              </button>
              <button
                onClick={() => { setActiveTab('register'); setPhoneNumber(''); setPassword(''); setConfirmPassword(''); }}
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
          <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-4">
             <div className="relative w-full flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-xs text-gray-400">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleAdminLogin} disabled={isLoading}>
                <svg className="mr-2 h-4 w-4" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 260.8 0 119.3 109.8 11.8 244 11.8c72.1 0 134.3 31.5 178.4 81.4l-74.2 67.5c-24.3-23-58.8-38.2-97.3-38.2-83.8 0-151.4 68.1-151.4 152.4s67.6 152.4 151.4 152.4c97.1 0 134.3-70.8 138.6-106.3H244v-87.9h244c4.6 24.8 7 52.1 7 82.8z"></path></svg>
                Administrator Login
            </Button>
          </CardFooter>
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
