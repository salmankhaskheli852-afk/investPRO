
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: '/user', label: 'Home', icon: Home },
  { href: '/user/investments', label: 'Invest', icon: Briefcase },
  { href: '/user/invitation', label: 'Team', icon: Users },
  { href: '/user', label: 'Me', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-up md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map((item, index) => {
          // Special check for 'Me' tab to be active only on the main '/user' page
          const isMeTab = item.label === 'Me';
          const isHomeTab = item.label === 'Home';
          
          let isActive = false;
          if (isMeTab) {
              // 'Me' is active if the path is exactly /user
              isActive = pathname === '/user';
          } else if(isHomeTab) {
              // 'Home' is active if the path is exactly /user
              isActive = pathname === '/user';
          }
          else {
             isActive = pathname.startsWith(item.href);
          }


          return (
            <Link
              key={index}
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
