'use client';

import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, TrendingUp, Wallet, History } from 'lucide-react';
import { ChatWidget } from '@/components/chat-widget';

const navItems: NavItem[] = [
  { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/investments', label: 'Investments', icon: TrendingUp },
  { href: '/user/wallet', label: 'Wallet', icon: Wallet },
  { href: '/user/history', label: 'History', icon: History },
];

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Sidebar variant='inset'>
        <SidebarNav navItems={navItems} />
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          <ChatWidget />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
