
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { 
  Bell, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  CalendarCheck, 
  Crown,
} from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import Image from 'next/image';

const ServiceButton = ({ icon, label, href, onClick }: { icon: React.ElementType, label: string, href?: string, onClick?: () => void }) => {
  const Icon = icon;
  const content = (
      <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card shadow-md hover:bg-gray-50 transition-colors">
        <div className="p-3 bg-green-100 rounded-full">
            <Icon className="h-8 w-8 text-primary" />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
  );

  if (href) {
      return <Link href={href}>{content}</Link>
  }
  return <button onClick={onClick} className="text-left w-full">{content}</button>;
};

export default function UserHomePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsRef);

  return (
    <>
    <div className="space-y-6">
      {/* Header Banner Carousel */}
      {appSettings?.carouselImages && appSettings.carouselImages.length > 0 && (
        <Carousel 
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {appSettings.carouselImages.map((url, index) => (
              <CarouselItem key={index}>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                  <Image src={url} alt={`Carousel image ${index + 1}`} fill className="object-cover" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      )}

      {/* Wallet Section */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <Link href="/user/wallet" className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Wallet</span>
          </Link>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/user/deposit">
              <div className="flex flex-col items-center p-2 rounded-lg bg-red-100 text-red-800 cursor-pointer">
                  <ArrowDownToLine className="h-6 w-6" />
                  <span className="text-xs font-bold">RECHARGE</span>
              </div>
            </Link>
            <Link href="/user/wallet">
              <div className="flex flex-col items-center p-2 rounded-lg bg-green-100 text-green-800">
                <ArrowUpFromLine className="h-6 w-6" />
                <span className="text-xs font-bold">WITHDRAW</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Service Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">Service</h2>
        <div className="grid grid-cols-3 gap-4">
          <ServiceButton icon={Users} label="Refer Friends" href="/user/invitation" />
          <Link href="/user/history">
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card shadow-md hover:bg-gray-50 transition-colors">
              <div className="p-3 bg-green-100 rounded-full">
                <CalendarCheck className="h-8 w-8 text-primary" />
              </div>
              <span className="text-sm font-medium text-gray-700">Daily check-in</span>
            </div>
          </Link>
          <ServiceButton icon={Crown} label="VIP Agent" href="#" />
        </div>
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
    </>
  );
}
