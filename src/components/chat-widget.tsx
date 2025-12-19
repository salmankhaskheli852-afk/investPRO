'use client';

import React from 'react';
import { Button } from './ui/button';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { ChatSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';

export function ChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const firestore = useFirestore();

  const chatSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'chat_settings') : null),
    [firestore]
  );
  const { data: chatSettings, isLoading } = useDoc<ChatSettings>(chatSettingsRef);

  if (isLoading || !chatSettings?.isChatEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80 shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3 p-4">
                 <Avatar>
                    <AvatarImage src="https://picsum.photos/seed/support/200" alt="Support" />
                    <AvatarFallback>S</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base">Support Assistant</CardTitle>
                    <CardDescription className="text-xs">How can we help you?</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
               <p className="text-sm text-center text-muted-foreground">Chat functionality is coming soon.</p>
            </CardContent>
        </Card>
      ) : (
         <Button
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="h-8 w-8" />
        </Button>
      )}

      {isOpen && (
         <Button
          variant="outline"
          size="icon"
          className="absolute -top-3 -right-3 rounded-full h-8 w-8 bg-background"
          onClick={() => setIsOpen(false)}
        >
          &times;
        </Button>
      )}
    </div>
  );
}
