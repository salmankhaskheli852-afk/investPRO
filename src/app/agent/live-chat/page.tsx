
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search } from 'lucide-react';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock data for chat UI
const mockUsers = [
  { id: '1', name: 'Alice', avatarUrl: 'https://picsum.photos/seed/alice/40', lastMessage: 'Okay, thanks!', unread: 2 },
  { id: '2', name: 'Bob', avatarUrl: 'https://picsum.photos/seed/bob/40', lastMessage: 'Can you help me with my account?', unread: 0 },
  { id: '3', name: 'Charlie', avatarUrl: 'https://picsum.photos/seed/charlie/40', lastMessage: 'I have a question about plans.', unread: 0 },
  { id: '4', name: 'Diana', avatarUrl: 'https://picsum.photos/seed/diana/40', lastMessage: '...', unread: 0 },
];

const mockMessages = [
    { id: 'm1', sender: 'user', text: 'Hello, I have a problem with my deposit.' },
    { id: 'm2', sender: 'agent', text: 'Hi Alice, I can help with that. What is the transaction ID?' },
    { id: 'm3', sender: 'user', text: 'The ID is TRX12345. It has been pending for 2 hours.' },
];

function ChatMessage({ message }: { message: { sender: string; text: string } }) {
  const isAgent = message.sender === 'agent';
  return (
    <div className={cn('flex items-end gap-2', isAgent ? 'justify-end' : 'justify-start')}>
      {!isAgent && <Avatar className="h-8 w-8"><AvatarImage /><AvatarFallback>A</AvatarFallback></Avatar>}
      <div
        className={cn(
          'max-w-xs rounded-lg px-4 py-2 lg:max-w-md',
          isAgent
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p>{message.text}</p>
      </div>
    </div>
  );
}

export default function AgentLiveChatPage() {
  const { user: agentUser } = useUser();
  const firestore = useFirestore();

  const [selectedUser, setSelectedUser] = React.useState(mockUsers[0]);

  const agentDocRef = useMemoFirebase(
    () => (agentUser && firestore ? doc(firestore, 'users', agentUser.uid) : null),
    [agentUser, firestore]
  );
  const { data: agentData } = useDoc<User>(agentDocRef);

  if (agentData && !agentData.permissions?.canAccessLiveChat) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access the live chat.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
         <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500 h-full">
            <Card className="h-full rounded-lg grid grid-cols-1 md:grid-cols-3">
                {/* User List */}
                <div className="col-span-1 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <h2 className="text-xl font-bold">Chats</h2>
                        <Input placeholder="Search users..." className="mt-2" icon={<Search className="h-4 w-4" />} />
                    </div>
                    <ScrollArea className="flex-1">
                        {mockUsers.map(user => (
                            <div 
                                key={user.id}
                                className={cn("flex items-center gap-3 p-3 cursor-pointer border-b hover:bg-muted/50", selectedUser.id === user.id && "bg-muted")}
                                onClick={() => setSelectedUser(user)}
                            >
                                <Avatar>
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="font-bold">{user.name}</div>
                                    <p className="text-sm text-muted-foreground truncate">{user.lastMessage}</p>
                                </div>
                                {user.unread > 0 && (
                                    <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                                        {user.unread}
                                    </div>
                                )}
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                {/* Chat Window */}
                <div className="col-span-2 flex flex-col h-full">
                   {selectedUser ? (
                    <>
                        <div className="flex items-center gap-3 p-3 border-b">
                            <Avatar>
                                <AvatarImage src={selectedUser.avatarUrl} />
                                <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-bold">{selectedUser.name}</h3>
                                <p className="text-sm text-muted-foreground">Online</p>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {mockMessages.map(msg => (
                                    <ChatMessage key={msg.id} message={msg} />
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="border-t p-4">
                            <div className="flex items-center gap-2">
                                <Input placeholder="Type your message..." />
                                <Button size="icon"><Send className="h-5 w-5" /></Button>
                            </div>
                        </div>
                    </>
                   ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Select a chat to start messaging</p>
                    </div>
                   )}
                </div>
            </Card>
         </div>
    </div>
  );
}
