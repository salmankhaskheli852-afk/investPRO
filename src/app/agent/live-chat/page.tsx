
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { ChatRoom, ChatMessage } from '@/lib/data';
import { collection, query, orderBy, where, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function ChatMessageBubble({ message, isOwn }: { message: ChatMessage, isOwn: boolean }) {
    return (
        <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
            {!isOwn && (
                 <Avatar className="h-8 w-8">
                    <AvatarFallback>{message.senderId.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-xs md:max-w-md rounded-lg px-4 py-2 text-sm",
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


function ChatWindow({ room, agentId }: { room: ChatRoom; agentId: string }) {
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'chat_rooms', room.id, 'messages'), orderBy('createdAt', 'asc')) : null,
        [firestore, room.id]
    );
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !firestore) return;

        const messageData = {
            roomId: room.id,
            senderId: agentId,
            text: newMessage,
            createdAt: serverTimestamp()
        };

        setNewMessage('');
        await addDoc(collection(firestore, 'chat_rooms', room.id, 'messages'), messageData);
        await updateDoc(doc(firestore, 'chat_rooms', room.id), {
            lastMessage: newMessage,
            lastMessageAt: serverTimestamp(),
            agentId: agentId,
        });

    };

    return (
        <div className="flex flex-col h-full">
            <header className="border-b p-4">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{room.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold">{room.userName}</h3>
                        <p className="text-xs text-muted-foreground">User ID: {room.userId.substring(0, 8)}...</p>
                    </div>
                </div>
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading && <p className="text-center">Loading messages...</p>}
                {messages?.map(msg => (
                    <ChatMessageBubble key={msg.id} message={msg} isOwn={msg.senderId === agentId} />
                ))}
            </div>
            <footer className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" type="button"><Paperclip /></Button>
                    <Input 
                        placeholder="Type your message..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        autoComplete='off'
                    />
                    <Button type="submit"><Send /></Button>
                </form>
            </footer>
        </div>
    )
}

function ChatRoomListItem({ room, isSelected, onSelect }: { room: ChatRoom; isSelected: boolean; onSelect: () => void; }) {
    return (
        <button 
            className={cn(
                "flex w-full items-center gap-3 p-3 text-left rounded-lg transition-colors",
                isSelected ? "bg-primary/10" : "hover:bg-muted"
            )}
            onClick={onSelect}
        >
            <Avatar>
                <AvatarFallback>{room.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <h4 className="font-semibold truncate">{room.userName}</h4>
                <p className="text-sm text-muted-foreground truncate">{room.lastMessage || 'No messages yet'}</p>
            </div>
            {room.lastMessageAt && (
                 <p className="text-xs text-muted-foreground self-start">
                    {formatDistanceToNow(room.lastMessageAt.toDate(), { addSuffix: true })}
                </p>
            )}
        </button>
    );
}

export default function AgentLiveChatPage() {
    const firestore = useFirestore();
    const { user: agentUser, isUserLoading } = useUser();
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

    const chatRoomsQuery = useMemoFirebase(
        () => firestore ? query(
            collection(firestore, 'chat_rooms'),
            where('isResolved', '==', false),
            orderBy('lastMessageAt', 'desc')
          ) : null,
        [firestore]
    );
    const { data: chatRooms, isLoading: isLoadingRooms } = useCollection<ChatRoom>(chatRoomsQuery);

    const selectedRoom = chatRooms?.find(room => room.id === selectedRoomId);

    if (isUserLoading || isLoadingRooms) {
        return <p>Loading chats...</p>
    }
    
    if (!agentUser) {
        return <p>You must be logged in to view this page.</p>
    }

    return (
        <div className="h-[calc(100vh-8rem)]">
            <Card className="h-full flex overflow-hidden">
                <aside className="w-1/3 border-r h-full overflow-y-auto">
                    <header className="p-4 border-b sticky top-0 bg-background z-10">
                        <h2 className="text-xl font-bold">Active Chats</h2>
                    </header>
                    <div className="p-2 space-y-1">
                        {chatRooms && chatRooms.length > 0 ? (
                            chatRooms.map(room => (
                                <ChatRoomListItem 
                                    key={room.id}
                                    room={room}
                                    isSelected={room.id === selectedRoomId}
                                    onSelect={() => setSelectedRoomId(room.id)}
                                />
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground p-4">No active chats found.</p>
                        )}
                    </div>
                </aside>
                <main className="w-2/3 h-full">
                    {selectedRoom ? (
                        <ChatWindow room={selectedRoom} agentId={agentUser.uid} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MessageSquare size={48} className="mb-4" />
                            <h3 className="text-lg font-semibold">Select a chat to start</h3>
                            <p className="text-sm">Choose a conversation from the left panel.</p>
                        </div>
                    )}
                </main>
            </Card>
        </div>
    );
}
