
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useUser, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import React from 'react';
import { signInWithGoogle } from '@/firebase/auth/sign-in';
import { useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User, AdminWallet, WithdrawalMethod } from '@/lib/data';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
    {...props}
  >
    <path fill="#4285F4" d="M24 9.5c3.13 0 5.9 1.12 7.96 3.04l-2.83 2.83c-.94-.89-2.2-1.43-3.13-1.43-2.67 0-4.96 1.79-5.78 4.22h-3.4v-2.73C13.23 12.45 18.23 9.5 24 9.5z" />
    <path fill="#34A853" d="M46.2 25.01c0-1.63-.14-3.2-.4-4.71H24v8.88h12.47c-.54 2.86-2.14 5.28-4.6 6.98v-2.73c2.46-1.14 4.1-3.64 4.1-6.42z" />
    <path fill="#FBBC05" d="M9.22 28.23c-.32-1.07-.5-2.2-.5-3.35s.18-2.28.5-3.35v-3.23h-4.3c-1.28 2.58-2.02 5.51-2.02 8.58s.74 6 2.02 8.58l4.3-3.23z" />
    <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-4.1-3.18c-2.13 1.43-4.88 2.28-8.79 2.28-5.79 0-10.79-3.05-12.82-7.27l-4.3 3.23C7.07 42.85 14.28 48 24 48z" />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const ADMIN_EMAIL = 'salmankhaskheli885@gmail.com';

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

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const seedInitialData = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);

    const adminWallets: AdminWallet[] = [
      { id: 'easypaisa', walletName: "Easypaisa", name: "you", number: "03087554721", isEnabled: true },
      { id: 'jazzcash', walletName: "JazzCash", name: "salman shop", number: "03433273391", isEnabled: true },
      { id: 'bank', walletName: 'Bank', name: 'Meezan Bank', number: '0308237554721', isBank: true, isEnabled: true }
    ];

    const withdrawalMethods: WithdrawalMethod[] = [
      { id: 'jazzcash', name: 'JazzCash', isEnabled: true },
      { id: 'easypaisa', name: 'Easypaisa', isEnabled: true },
      { id: 'bank', name: 'Bank Transfer', isEnabled: true },
    ];

    // Seed admin wallets
    const adminWalletsCollection = collection(firestore, 'admin_wallets');
    const adminWalletsSnapshot = await getDoc(doc(adminWalletsCollection, adminWallets[0].id));
    if (!adminWalletsSnapshot.exists()) {
        adminWallets.forEach(wallet => {
            const docRef = doc(adminWalletsCollection, wallet.id);
            batch.set(docRef, wallet);
        });
    }

    // Seed withdrawal methods
    const withdrawalMethodsCollection = collection(firestore, 'withdrawal_methods');
    const withdrawalMethodsSnapshot = await getDoc(doc(withdrawalMethodsCollection, withdrawalMethods[0].id));
    if (!withdrawalMethodsSnapshot.exists()) {
        withdrawalMethods.forEach(method => {
            const docRef = doc(withdrawalMethodsCollection, method.id);
            batch.set(docRef, method);
        });
    }

    await batch.commit();
  };

  const createUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Seed initial data if it's the first time for an admin
      const role = firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user';
      if (role === 'admin') {
          await seedInitialData();
      }

      // Create user profile
      await setDoc(userRef, {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Anonymous User',
        email: firebaseUser.email,
        avatarUrl: firebaseUser.photoURL,
        investments: [],
        createdAt: serverTimestamp(),
        role: role,
      });

      // If user is an admin, also add them to the roles collection
      if (role === 'admin') {
        const adminRoleRef = doc(firestore, 'roles_admin', firebaseUser.uid);
        await setDoc(adminRoleRef, { role: 'admin' });
      }

      // Create user wallet
      const walletRef = doc(collection(firestore, 'users', firebaseUser.uid, 'wallets'), 'main');
      await setDoc(walletRef, {
        balance: 0,
        userId: firebaseUser.uid,
      });
    }
  };

  const handleSignIn = async () => {
    if (!auth) return;
    const result = await signInWithGoogle(auth);
    if (result?.user) {
      await createUserProfile(result.user);
    }
  };
  
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <h1 className="font-headline text-4xl font-bold text-primary">InvesPro</h1>
          <CardDescription className="pt-2">Your trusted partner in modern investments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" size="lg" onClick={handleSignIn}>
              <GoogleIcon className="mr-2" />
              Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground pt-4">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Reliable</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-primary" />
            <span>Community</span>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
