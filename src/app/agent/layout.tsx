
'use client';

import React from 'react';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, MessageSquare, History, MessageCircle } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User, AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { MaintenancePage } from '@/components/maintenance-page';

function AgentNav() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: agentData } = useDoc<User>(userDocRef);

  const navItems = React.useMemo(() => {
    const items: NavItem[] = [
      { href: '/agent', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/agent/users', label: 'My Users', icon: Users },
    ];

    if (agentData?.permissions?.canManageDepositRequests) {
      items.push({ href: '/agent/deposits', label: 'Deposits', icon: ArrowDownToLine });
    }
    if (agentData?.permissions?.canManageWithdrawalRequests) {
      items.push({ href: '/agent/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine });
    }
     if (agentData?.permissions?.canViewUserHistory) {
      items.push({ href: '/agent/history', label: 'History', icon: History });
    }
    if (agentData?.permissions?.canAccessLiveChat) {
      items.push({ href: '/agent/live-chat', label: 'Live Chat', icon: MessageCircle });
    }
    
    return items;
  }, [agentData]);

  return <SidebarNav navItems={navItems} />;
}


export default function AgentLayout({
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

  if (appSettings?.agentMaintenanceMode) {
    return (
      <MaintenancePage 
        message={appSettings.agentMaintenanceMessage || 'The agent panel is currently under maintenance. We will be back shortly.'}
      />
    );
  }
  
  return (
    <SidebarProvider>
      <Sidebar variant='inset'>
        <AgentNav />
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 bg-login-gradient p-4 sm:p-6 lg:p-8">
            <div className="rounded-xl p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500 h-full">
              <div className="bg-card rounded-lg p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
