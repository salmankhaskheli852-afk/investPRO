
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Wallet, History, GitBranch, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md border-t bg-background shadow-up">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
