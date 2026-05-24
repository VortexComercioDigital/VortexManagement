'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Package,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'vendedor', 'dev'],
  },
  {
    href: '/kanban',
    label: 'Kanban',
    icon: KanbanSquare,
    roles: ['admin', 'vendedor', 'dev'],
  },
  {
    href: '/leads',
    label: 'Clientes',
    icon: Users,
    roles: ['admin', 'vendedor', 'dev'],
  },
  {
    href: '/servicos',
    label: 'Serviços',
    icon: Package,
    roles: ['admin', 'dev'],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push('/login');
  };

  const filteredItems = profile
    ? navItems.filter((item) => item.roles.includes(profile.role))
    : [];

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-slate-900 text-white border-r border-slate-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold text-sm shrink-0">
            A
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg tracking-tight whitespace-nowrap">
              AgênciaCRM
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        <div className="px-2 pb-4 space-y-2">
          <Separator className="bg-slate-700" />
          {profile && !collapsed && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-slate-200 truncate">
                {profile.name || 'Usuário'}
              </p>
              <p className="text-xs text-slate-500 capitalize">{profile.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
