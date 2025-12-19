import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from './layout/sidebar-nav';
import { Header } from './layout/header';

interface CommonLayoutProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

export function CommonLayout({ navItems, children }: CommonLayoutProps) {
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
