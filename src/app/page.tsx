'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import React from 'react';
import { signInWithGoogle } from '@/firebase/auth/sign-in';
import { useAuth } from '@/firebase';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="24px"
    height="24px"
    {...props}
  >
    <path
      fill="#4285F4"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#34A853"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l5.657,5.657C41.312,34.761,44,29.69,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <path
      fill="#FBBC05"
      d="M19.913,28.607c-0.034-0.844-0.034-1.681,0-2.524l-5.657-5.657c-1.57,3.132-1.57,6.883,0,10.015L19.913,28.607z"
    />
    <path
      fill="#EA4335"
      d="M24,16c-1.928,0-3.664,0.762-4.94,2.04l5.657,5.657c-0.006-0.006-0.012-0.012-0.018-0.018c1.233-1.125,2.022-2.82,2.022-4.679C26.721,18.069,25.5,16.5,24,16z"
    />
    <path fill="none" d="M4,4h40v40H4z" />
  </svg>
);

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const auth = useAuth();

  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/user');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
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
          <Button className="w-full" size="lg" onClick={() => signInWithGoogle(auth)}>
              <GoogleIcon className="mr-2" />
              Sign in with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or view a panel
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button asChild variant="outline">
              <Link href="/admin">Admin</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agent">Agent</Link>
            </Button>
          </div>
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
