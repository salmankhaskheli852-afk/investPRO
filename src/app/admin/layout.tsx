import { CommonLayout } from '@/components/common-layout';
import type { NavItem } from '@/components/layout/sidebar-nav';
import { LayoutDashboard, TrendingUp, Users, UserCog, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | InvesPro',
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/investments', label: 'Investments', icon: TrendingUp },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/agents', label: 'Agents', icon: UserCog },
  { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CommonLayout navItems={navItems}>{children}</CommonLayout>;
}
