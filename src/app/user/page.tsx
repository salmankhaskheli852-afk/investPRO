
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
  History, 
  Crown,
  Gift,
  Ticket,
  Award,
  Share2
} from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import Image from 'next/image';

const ServiceButton = ({ icon, label, href, className }: { icon: React.ElementType, label: string, href: string, className?: string }) => {
  const Icon = icon;
  return (
    <Link href={href} className="text-center group">
      <div className={cn("p-4 rounded-xl shadow-md transition-all hover:transform hover:-translate-y-1", className)}>
        <div className="mx-auto bg-white/20 group-hover:bg-white/30 transition-colors rounded-full h-14 w-14 flex items-center justify-center mb-2">
            <Icon className="h-8 w-8 text-white" />
        </div>
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </div>
    </Link>
  );
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

  const services = [
    { icon: Share2, label: 'Refer Friends', href: '/user/invitation', className: 'bg-gradient-to-br from-blue-300 to-indigo-400' },
    { icon: History, label: 'History', href: '/user/history', className: 'bg-gradient-to-br from-purple-300 to-violet-400' },
    { icon: Award, label: 'VIP Agent', href: '#', className: 'bg-gradient-to-br from-amber-300 to-orange-400' },
  ];

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
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Wallet</h2>
        <div className="grid grid-cols-2 gap-4">
            <Link href="/user/deposit" className="block p-4 rounded-xl bg-gradient-to-br from-red-200 to-rose-300 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-red-800">RECHARGE</span>
                    <div className="p-2 bg-white/50 rounded-full">
                        <ArrowDownToLine className="h-6 w-6 text-red-600" />
                    </div>
                </div>
            </Link>
             <Link href="/user/wallet" className="block p-4 rounded-xl bg-gradient-to-br from-green-200 to-emerald-300 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-green-800">WITHDRAW</span>
                    <div className="p-2 bg-white/50 rounded-full">
                        <ArrowUpFromLine className="h-6 w-6 text-green-600" />
                    </div>
                </div>
            </Link>
        </div>
      </div>
      
      {/* Service Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-slate-800">Service</h2>
        <div className="grid grid-cols-3 gap-4">
          {services.map((service, index) => (
            <ServiceButton 
              key={index}
              icon={service.icon} 
              label={service.label} 
              href={service.href} 
              className={service.className} 
            />
          ))}
        </div>
      </div>
       
        {/* Profit Model Section */}
        <div>
            <h2 className="text-xl font-bold mb-4 text-slate-800">Profit Model</h2>
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
