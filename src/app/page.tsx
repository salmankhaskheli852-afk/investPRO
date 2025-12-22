'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect to their dashboard (logic is in the main layout)
        router.push('/user/me'); 
      } else {
        // If user is not logged in, redirect to the new sign-up page
        router.push('/auth/sign-up');
      }
    }
  }, [user, isUserLoading, router]);

  // Display a loading message while we determine the user's auth state
  return (
    <div className="flex min-h-screen items-center justify-center bg-login-gradient">
      <p className="text-white">Loading...</p>
    </div>
  );
}
