
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
import { LogOut, Settings, User as UserIcon, ShieldCheck, Copy, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import React from 'react';
import { doc } from 'firebase/firestore';
import type { AppSettings, User } from '@/lib/data';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };
  
  const handleCopy = (text: string, label: string) => {
    if (typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} has been copied to your clipboard.`,
    });
  };
  
  const handleShare = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    let shareUrl = window.location.origin; // Default to base URL
    
    // If a logged-in user is sharing, create their personal referral link
    if (userData?.id && appSettings?.baseInvitationUrl) {
        const baseUrl = appSettings.baseInvitationUrl.endsWith('/') 
            ? appSettings.baseInvitationUrl 
            : `${appSettings.baseInvitationUrl}/`;
        shareUrl = `${baseUrl}?ref=${userData.id}`;
    }

    const shareData = {
        title: 'investPro',
        text: 'Check out this amazing investment platform!',
        url: shareUrl,
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback for browsers that don't support the Web Share API
            navigator.clipboard.writeText(shareUrl);
            toast({
                title: 'Link Copied!',
                description: 'The share link has been copied to your clipboard.',
            });
        }
    } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback to clipboard if sharing fails for other reasons
          navigator.clipboard.writeText(shareUrl);
          toast({
              title: 'Link Copied!',
              description: 'Sharing was cancelled, so the link was copied to your clipboard instead.',
          });
        }
    }
};


  const showSidebarTrigger = pathname.startsWith('/admin') || pathname.startsWith('/agent');

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-blue-950 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        {showSidebarTrigger && <SidebarTrigger className="md:hidden text-white hover:bg-white/20" />}
        <Link href="/" className="flex items-center gap-2">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-white"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="font-headline text-lg font-semibold text-white">investPro</span>
        </Link>
         {!isLoadingSettings && appSettings?.isVerificationBadgeEnabled && appSettings?.verificationBadgeText && (
          <div className="hidden md:flex items-center gap-1.5 ml-4 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            <ShieldCheck className="h-4 w-4" />
            <span>{appSettings.verificationBadgeText}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleShare} className="text-white hover:bg-white/20">
            <Share2 className="h-5 w-5" />
            <span className="sr-only">Share</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              {isUserLoading ? (
                 <Skeleton className="h-9 w-9 rounded-full" />
              ) : (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userData?.avatarUrl || undefined} alt="User Avatar" />
                  <AvatarFallback>{userData?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            {isUserLoading ? (
              <DropdownMenuLabel className="font-normal">Loading...</DropdownMenuLabel>
            ) : user ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                    {userData?.id && (
                      <div className="flex items-center pt-1">
                          <p className="text-xs leading-none text-muted-foreground truncate">ID: {userData.id}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleCopy(String(userData.id), 'User ID')}>
                              <Copy className="h-3 w-3" />
                          </Button>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/user/me">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
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
      </div>
    </header>
  );
}
