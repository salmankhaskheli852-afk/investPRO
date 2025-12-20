
'use client';

import { Header } from '@/components/layout/header';
import { WhatsAppWidget } from '@/components/whatsapp-widget';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { AppSettings, User } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { MaintenancePage } from '@/components/maintenance-page';
import { VerificationPopup } from '@/components/verification-popup';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const isLoading = isLoadingSettings || isUserLoading || isLoadingUser;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (appSettings?.userMaintenanceMode) {
    return (
      <MaintenancePage 
        message={appSettings.userMaintenanceMessage || 'The user panel is currently under maintenance. We will be back shortly.'}
      />
    );
  }
  
  const showVerificationPopup = appSettings?.isVerificationEnabled && userData && !userData.isVerified;

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24">
        {showVerificationPopup && <VerificationPopup />}
        {children}
      </main>
      <WhatsAppWidget />
      <BottomNav />
    </div>
  );
}
