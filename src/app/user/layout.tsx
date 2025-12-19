import { CommonLayout } from '@/components/common-layout';
import type { NavItem } from '@/components/layout/sidebar-nav';
import { LayoutDashboard, TrendingUp, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User | InvesPro',
};

const navItems: NavItem[] = [
  { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/investments', label: 'Investments', icon: TrendingUp },
  { href: '/user/wallet', label: 'Wallet', icon: Wallet },
];

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CommonLayout navItems={navItems}>{children}</CommonLayout>;
}
