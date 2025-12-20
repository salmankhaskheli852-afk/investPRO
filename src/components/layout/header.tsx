
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, Settings, User as UserIcon, ShieldCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import type { AppSettings, User } from '@/lib/data';
import { Skeleton } from '../ui/skeleton';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);

  const appSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(appSettingsRef);

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isLoadingUserData } = useDoc<User>(userDocRef);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const renderVerificationStatus = () => {
    const isLoading = isLoadingSettings || isLoadingUserData;

    if (isLoading) {
      return (
        <div className="hidden items-center gap-1.5 sm:flex">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      );
    }
  
    if (!appSettings?.isVerificationEnabled) {
      return null;
    }
  
    if (userData?.isVerified) {
      return (
        <div className="hidden items-center gap-1.5 sm:flex">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-600">{appSettings.verificationBadgeText || "Verified"}</span>
        </div>
      );
    }
  
    // Show 'Not Verified' for any user role if the system is on and they aren't verified.
    return (
      <div className="hidden items-center gap-1.5 sm:flex">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <span className="text-sm font-medium text-amber-500">Not Verified</span>
      </div>
    );
  }

  const renderUserMenu = () => {
    if (!hasMounted) {
       return <Skeleton className="h-9 w-9 rounded-full" />;
    }
    
    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || undefined} alt="User Avatar" />
                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            {isUserLoading ? (
              <DropdownMenuLabel className="font-normal">Loading...</DropdownMenuLabel>
            ) : user ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => router.push('/')}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log in</span>
                </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
    )
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Link href="/" className="flex items-center gap-2">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="font-headline text-lg font-semibold text-primary">investPro</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {renderVerificationStatus()}
        {renderUserMenu()}
      </div>
    </header>
  );
}
