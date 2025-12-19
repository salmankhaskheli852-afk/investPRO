
'use client';

import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, TrendingUp, Wallet, History, GitBranch } from 'lucide-react';
import { WhatsAppWidget } from '@/components/whatsapp-widget';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { MaintenancePage } from '@/components/maintenance-page';

const navItems: NavItem[] = [
  { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/investments', label: 'Investments', icon: TrendingUp },
  { href: '/user/wallet', label: 'Wallet', icon: Wallet },
  { href: '/user/history', label: 'History', icon: History },
  { href: '/user/invitation', label: 'Invitation', icon: GitBranch },
];

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'app_config', 'app_settings') : null),
    [firestore]
  );
  const { data: appSettings, isLoading } = useDoc<AppSettings>(settingsRef);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (appSettings?.userMaintenanceMode) {
    return (
      <MaintenancePage 
        message={appSettings.userMaintenanceMessage || 'The user panel is currently under maintenance. We will be back shortly.'}
      />
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant='inset'>
        <SidebarNav navItems={navItems} />
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          <WhatsAppWidget />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
