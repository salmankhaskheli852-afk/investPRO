
'use client';

import React from 'react';
import { Button } from './ui/button';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { ChatSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
      focusable="false"
      {...props}
    >
      <path
        d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.543-.57-1.08-.823-1.08-.25 0-.56.398-.78.398a.63.63 0 0 0-.314.1c-.24.113-.56.4-1.096.903-.532.5-.84 1.003-.942 1.258-.1.25-.31.83-.31 1.398 0 .57.253.948.372 1.067.114.113.37.44.86.913.49.47.96.928 1.448 1.388.48.45.99.848 1.53 1.157.54.302 1.05.47 1.57.47.51 0 1.21-.19 1.66-.407.45-.21.82-.57.82-1.14 0-.57-.25-1.08-.52-1.08z"
        fill="currentColor"
      ></path>
      <path
        d="M20.57 4.357a12.83 12.83 0 0 0-15.22 15.22l-1.2 4.8 4.9-1.18a12.83 12.83 0 0 0 15.22-15.22zm-4.08 1.93a10.83 10.83 0 0 1 9.17 9.17l.006.005a10.83 10.83 0 0 1-9.17 9.17l-5.2 1.25-1.26-5.02a10.83 10.83 0 0 1 9.17-9.17zm-.45 1.83a9.33 9.33 0 0 0-8.1 8.1l-.005.005a9.33 9.33 0 0 0 8.1 8.1l4.48-1.08 1.08-4.32a9.33 9.33 0 0 0-8.1-8.1z"
        fill="currentColor"
      ></path>
    </svg>
  );


export function WhatsAppWidget() {
  const firestore = useFirestore();

  const chatSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'chat_settings') : null),
    [firestore]
  );
  const { data: chatSettings, isLoading } = useDoc<ChatSettings>(chatSettingsRef);

  const handleChatClick = () => {
    if (chatSettings?.whatsappNumber) {
      // Remove any non-digit characters from the number
      const cleanNumber = chatSettings.whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading || !chatSettings?.whatsappNumber) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        size="lg"
        className="rounded-full h-16 w-16 shadow-lg bg-[#25D366] hover:bg-[#1DA851] text-white"
        onClick={handleChatClick}
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="h-8 w-8" />
      </Button>
    </div>
  );
}
