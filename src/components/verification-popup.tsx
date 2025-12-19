
'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export function VerificationPopup() {
  const [isOpen, setIsOpen] = React.useState(true);
  const firestore = useFirestore();
  const router = useRouter();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  const handleDepositClick = () => {
    setIsOpen(false);
    router.push('/user/wallet');
  };

  if (!appSettings) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {appSettings.verificationPopupTitle || 'Account Verification Required'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {appSettings.verificationPopupMessage || 'To ensure the security of your account and enable all features including withdrawals, please verify your account by making a one-time deposit.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2 text-center">
            <p className="text-sm text-muted-foreground">Verification Deposit Amount</p>
            <p className="text-3xl font-bold">
                {(appSettings.verificationDepositAmount || 0).toLocaleString()} <span className="text-lg font-medium">PKR</span>
            </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDepositClick} className="w-full">
            Proceed to Deposit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
