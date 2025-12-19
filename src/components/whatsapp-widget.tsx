
'use client';

import React from 'react';
import { Button } from './ui/button';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { ChatSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { MessageSquare, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function WhatsAppWidget() {
  const firestore = useFirestore();

  const chatSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'chat_settings') : null),
    [firestore]
  );
  const { data: chatSettings, isLoading } = useDoc<ChatSettings>(chatSettingsRef);

  const handleChatClick = () => {
    if (chatSettings?.whatsappNumber) {
      const cleanNumber = chatSettings.whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCommunityClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the main chat button click event
    if (chatSettings?.whatsappCommunityLink) {
      window.open(chatSettings.whatsappCommunityLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading || (!chatSettings?.whatsappNumber && !chatSettings?.whatsappCommunityLink)) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2">
        {chatSettings?.whatsappCommunityLink && (
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

        {chatSettings?.whatsappNumber && (
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
