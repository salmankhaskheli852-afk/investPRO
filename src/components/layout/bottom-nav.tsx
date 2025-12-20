
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Wallet, History, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/user/investments', label: 'Investments', icon: TrendingUp },
  { href: '/user/wallet', label: 'Wallet', icon: Wallet },
  { href: '/user/history', label: 'History', icon: History },
  { href: '/user/invitation', label: 'Invitation', icon: GitBranch },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-up md:hidden">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const isActive = (pathname === '/user' && item.href === '/user') || (item.href !== '/user' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
