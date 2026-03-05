
'use client';

import React, { useEffect } from 'react';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { Users, UserCog, Wallet, ArrowDownToLine, ArrowUpFromLine, Settings, GitBranch, KeyRound, DollarSign } from 'lucide-react';
import { ModernDashboardIcon } from '@/components/modern-dashboard-icon';
import { ModernInvestmentIcon } from '@/components/modern-investment-icon';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/data';

const DashboardIconWrapper = () => <ModernDashboardIcon size={18} />;
const InvestmentIconWrapper = () => <ModernInvestmentIcon size={18} />;

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: DashboardIconWrapper },
  { href: '/admin/investments', label: 'Investments', icon: InvestmentIconWrapper },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/agents', label: 'Agents', icon: UserCog },
  { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
  { href: '/admin/deposits', label: 'Deposits', icon: ArrowDownToLine },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { href: '/admin/recharge', label: 'Recharge Settings', icon: DollarSign },
  { href: '/admin/password-requests', label: 'Password Requests', icon: KeyRound },
  { href: '/admin/referrals', label: 'Referral Settings', icon: GitBranch },
  { href: '/admin/settings', label: 'App Settings', icon: Settings },
];

const ADMIN_EMAILS = ['salmankhaskheli885@gmail.com', 'salmankhaskheli852@gmail.com'];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isDocLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !isDocLoading) {
      if (!user) {
        router.push('/auth/sign-up');
      } else {
        const userEmail = user.email?.toLowerCase() || '';
        const isSuperAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
        const hasAdminRole = userData && userData.role === 'admin';
        
        if (!isSuperAdmin && !hasAdminRole) {
          // Redirect non-admin users to their dashboard
          router.push('/user/me');
        }
      }
    }
  }, [user, isUserLoading, userData, isDocLoading, router]);

  if (isUserLoading || isDocLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying admin access...</p>
      </div>
    );
  }

  const userEmail = user?.email?.toLowerCase() || '';
  const isSuperAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
  const hasAdminRole = userData && userData.role === 'admin';

  // Only render children if user is an admin or super admin
  if (!isSuperAdmin && !hasAdminRole) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar variant='inset'>
        <SidebarNav navItems={navItems} />
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 bg-login-gradient p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-none mx-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
