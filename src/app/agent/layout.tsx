'use client';

import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { LayoutDashboard, Users } from 'lucide-react';

const navItems: NavItem[] = [
  { href: '/agent', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agent/users', label: 'My Users', icon: Users },
];

export default function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav navItems={navItems} />
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
