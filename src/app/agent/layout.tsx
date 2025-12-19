import { CommonLayout } from '@/components/common-layout';
import type { NavItem } from '@/components/layout/sidebar-nav';
import { LayoutDashboard, Users } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent | InvesPro',
};

const navItems: NavItem[] = [
  { href: '/agent', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agent/users', label: 'My Users', icon: Users },
];

export default function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CommonLayout navItems={navItems}>{children}</CommonLayout>;
}
