
'use client';

import React from 'react';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, MessageCircle } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/data';
import { doc } from 'firebase/firestore';

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
  return (
    <SidebarProvider>
      <Sidebar variant='inset'>
        <AgentNav />
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
