
'use client';

import React from 'react';
import { Button } from './ui/button';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { MessageSquare, Users, Download } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function WhatsAppWidget() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);

  const appSettingsRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore, user]
  );
  const { data: appSettings, isLoading } = useDoc<AppSettings>(appSettingsRef);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };
  
  const handleChatClick = () => {
    if (appSettings?.whatsappNumber) {
      const cleanNumber = appSettings.whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCommunityClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the main chat button click event
    if (appSettings?.whatsappCommunityLink) {
      window.open(appSettings.whatsappCommunityLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return null;
  }
  
  const showAnything = installPrompt || appSettings?.whatsappCommunityLink || appSettings?.whatsappNumber;

  if (!showAnything) {
    return null;
  }


  return (
    <TooltipProvider>
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-center gap-2">
        {installPrompt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="rounded-full h-10 w-10 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                aria-label="Download App"
                onClick={handleInstallClick}
              >
                <Download className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Download App</p>
            </TooltipContent>
          </Tooltip>
        )}

        {appSettings?.whatsappCommunityLink && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="rounded-full h-10 w-10 shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleCommunityClick}
                aria-label="Join our Community"
              >
                <Users className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Join Community</p>
            </TooltipContent>
          </Tooltip>
        )}

        {appSettings?.whatsappNumber && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className="rounded-full h-16 w-16 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleChatClick}
                aria-label="Chat on WhatsApp"
              >
                <MessageSquare className="h-8 w-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Chat with Support</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
