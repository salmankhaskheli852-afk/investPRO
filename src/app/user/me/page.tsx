
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/data';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { 
  Bell, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  CalendarCheck, 
  Crown, 
  Gift, 
  Dice5, 
  ScrollText 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image';

const ServiceButton = ({ icon, label, href }: { icon: React.ElementType, label: string, href: string }) => {
  const Icon = icon;
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-white shadow-md hover:bg-gray-50 transition-colors">
      <Icon className="h-8 w-8 text-primary" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
};

const FeatureCard = ({ icon, label, href, className }: { icon: React.ElementType, label: string, href: string, className?: string }) => {
    const Icon = icon;
    return (
         <Link href={href} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg shadow-md hover:opacity-90 transition-opacity text-white ${className}`}>
            <Icon className="h-8 w-8" />
            <span className="font-bold">{label}</span>
        </Link>
    )
}

export default function MePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const canCheckIn = React.useMemo(() => {
    if (!userData?.dailyCheckIn) return true;
    const lastCheckInDate = format(userData.dailyCheckIn.toDate(), 'yyyy-MM-dd');
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    return lastCheckInDate !== todayDate;
  }, [userData]);


  const handleDailyCheckIn = async () => {
    if (!userDocRef || !canCheckIn) return;
    try {
      await updateDoc(userDocRef, {
        dailyCheckIn: serverTimestamp()
      });
      toast({
        title: 'Checked In!',
        description: 'You have successfully checked in for today.',
      });
    } catch(e: any) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: e.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-xl overflow-hidden p-6 flex items-center justify-center bg-gradient-to-r from-green-300 to-blue-200">
        <Image src="/logo.svg" alt="SPF Logo" width={100} height={100} className="opacity-80" />
        <span className="text-5xl font-extrabold text-white opacity-90 ml-4">SPF</span>
      </div>

      {/* Wallet Section */}
      <Link href="/user/wallet">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Wallet</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center p-2 rounded-lg bg-red-100 text-red-800">
                    <ArrowDownToLine className="h-6 w-6" />
                    <span className="text-xs font-bold">RECHARGE</span>
                </div>
                 <div className="flex flex-col items-center p-2 rounded-lg bg-green-100 text-green-800">
                    <ArrowUpFromLine className="h-6 w-6" />
                    <span className="text-xs font-bold">WITHDRAW</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Service Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">Service</h2>
        <div className="grid grid-cols-3 gap-4">
          <ServiceButton icon={Users} label="Refer Friends" href="/user/invitation" />
          <div onClick={handleDailyCheckIn} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-white shadow-md ${canCheckIn ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>
            <CalendarCheck className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium text-gray-700">Daily check-in</span>
          </div>
          <ServiceButton icon={Crown} label="VIP Agent" href="#" />
        </div>
      </div>
      
       {/* Feature Cards Section */}
       <div className="grid grid-cols-3 gap-4">
            <FeatureCard icon={Gift} label="My Gift" href="#" className="bg-gradient-to-r from-blue-400 to-blue-500" />
            <FeatureCard icon={Dice5} label="Lucky Draw" href="#" className="bg-gradient-to-r from-purple-400 to-purple-500" />
            <FeatureCard icon={ScrollText} label="Task reward" href="#" className="bg-gradient-to-r from-orange-400 to-orange-500" />
       </div>
       
        {/* Profit Model Section */}
        <div>
            <h2 className="text-xl font-bold mb-4">Profit Model</h2>
            <Card>
                <CardContent className="p-4">
                    <p className="text-muted-foreground">Details about the profit model will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
