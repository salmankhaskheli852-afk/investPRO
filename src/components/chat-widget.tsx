
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { MessageSquare, Send, Paperclip, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import type { ChatSettings, ChatRoom, ChatMessage } from '@/lib/data';
import { doc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { formatDistanceToNow } from 'date-fns';

function ChatMessageBubble({ message, isOwn }: { message: ChatMessage, isOwn: boolean }) {
    return (
        <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
            {!isOwn && (
                 <Avatar className="h-8 w-8">
                    <AvatarImage src="https://picsum.photos/seed/support/200" alt="Support" />
                    <AvatarFallback>S</AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-xs rounded-lg px-3 py-2 text-sm",
                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                <p>{message.text}</p>
                {message.createdAt && (
                    <p className={cn("text-xs mt-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })}
                    </p>
                )}
            </div>
        </div>
    );
}


export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const firestore = useFirestore();
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch global chat settings
  const chatSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'chat_settings') : null),
    [firestore]
  );
  const { data: chatSettings, isLoading: isLoadingSettings } = useDoc<ChatSettings>(chatSettingsRef);

  // Find or create a chat room for the current user
  const chatRoomQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'chat_rooms'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: chatRooms } = useCollection<ChatRoom>(chatRoomQuery);
  const chatRoom = chatRooms?.[0];

  // Fetch messages for the user's chat room
  const messagesQuery = useMemoFirebase(
    () => (firestore && chatRoom ? query(collection(firestore, 'chat_rooms', chatRoom.id, 'messages'), orderBy('createdAt', 'asc')) : null),
    [firestore, chatRoom]
  );
  const { data: messages } = useCollection<ChatMessage>(messagesQuery);
  
  useEffect(() => {
    if (isOpen && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !firestore || !user) return;

    let currentRoomId = chatRoom?.id;

    // Create a new room if it doesn't exist
    if (!currentRoomId) {
        const newRoomRef = doc(collection(firestore, 'chat_rooms'));
        const newRoomData: Omit<ChatRoom, 'id'> = {
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            createdAt: serverTimestamp() as any,
            isResolved: false,
            lastMessage: newMessage,
            lastMessageAt: serverTimestamp() as any,
        };
        await setDoc(newRoomRef, newRoomData);
        currentRoomId = newRoomRef.id;
    }
    
    if(!currentRoomId) return;

    // Add the new message
    const messageData = {
        roomId: currentRoomId,
        senderId: user.uid,
        text: newMessage,
        createdAt: serverTimestamp()
    };
    await addDoc(collection(firestore, 'chat_rooms', currentRoomId, 'messages'), messageData);
    
    // Update the room's last message
    await updateDoc(doc(firestore, 'chat_rooms', currentRoomId), {
        lastMessage: newMessage,
        lastMessageAt: serverTimestamp()
    });

    setNewMessage('');
  };


  if (isLoadingSettings || !chatSettings?.isChatEnabled || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80 sm:w-96 h-[60vh] flex flex-col shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3 p-4">
                 <Avatar>
                    <AvatarImage src="https://picsum.photos/seed/support/200" alt="Support" />
                    <AvatarFallback>S</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-base">Support Team</CardTitle>
                    <CardDescription className="text-xs">We'll reply as soon as possible.</CardDescription>
                </div>
            </CardHeader>
            <CardContent ref={scrollRef} className="p-4 flex-1 overflow-y-auto space-y-4">
                {messages?.map(msg => (
                    <ChatMessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user.uid} />
                ))}
                 {!messages && <p className='text-center text-sm text-muted-foreground'>Send a message to start the conversation.</p>}
            </CardContent>
             <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2">
                <Button variant="ghost" size="icon" type="button"><Paperclip /></Button>
                <Input 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    autoComplete='off'
                />
                <Button type="submit"><Send /></Button>
            </form>
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
          className="absolute -top-2 -right-2 rounded-full h-8 w-8 bg-background z-10"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
