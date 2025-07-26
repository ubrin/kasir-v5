
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, LayoutDashboard, Users, FileText, AlertTriangle, Settings, LogOut, Package, CreditCard, ChevronDown, BarChart3, Home, BookText, TrendingDown, History, Wallet, AreaChart, Coins, UsersRound, DollarSign } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from '@/components/ui/sidebar';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useSidebar } from '@/components/ui/sidebar';


const menuItems = [
  { href: '/home', label: 'Home', icon: Home, roles: ['admin', 'user'] },
  { href: '/finance', label: 'Keuangan', icon: Wallet, roles: ['admin'] },
  { href: '/monthly-statistics', label: 'Statistik Bulanan', icon: AreaChart, roles: ['admin'] },
  {
    label: 'Transaksi',
    icon: Coins,
    roles: ['admin', 'user'],
    subItems: [
      { href: '/delinquency', label: 'Tagihan', icon: CreditCard, roles: ['admin', 'user'] },
      { href: '/payment-report', label: 'Laporan', icon: BarChart3, roles: ['admin'] },
    ]
  },
  { href: '/customers', label: 'Data Pelanggan', icon: Users, roles: ['admin', 'user'] },
  { href: '/expenses', label: 'Pengeluaran', icon: TrendingDown, roles: ['admin'] },
  { href: '/other-incomes', label: 'Pemasukan Lainnya', icon: DollarSign, roles: ['admin'] },
  { href: '/collectors', label: 'Daftar Penagih', icon: UsersRound, roles: ['admin'] },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();

  const handleItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Logout Berhasil',
        description: 'Anda telah berhasil keluar.',
      });
      router.push('/');
    } catch (error) {
       toast({
        title: 'Logout Gagal',
        description: 'Terjadi kesalahan saat mencoba keluar.',
        variant: 'destructive'
      });
    }
  };

  const hasAccess = (roles: string[]) => {
    if (!user?.role) return false;
    return roles.includes(user.role);
  }

  const isSubItemActive = (subItems?: any[]) => {
    if (!subItems) return false;
    return subItems.some(sub => pathname.startsWith(sub.href!));
  }

  return (
    <Sidebar className="dark:bg-background border-r dark:border-slate-800">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 justify-start">
            <Link href="/home" className="flex items-center gap-2">
                <Image src="/icon-512x512.png" alt="Logo Aplikasi" width={40} height={40} />
                <h1 className="text-lg font-semibold text-foreground hidden group-data-[state=expanded]:block">Tagihan Adit</h1>
            </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.filter(item => hasAccess(item.roles)).map((item, index) => (
            item.subItems ? (
              <Collapsible key={index} defaultOpen={isSubItemActive(item.subItems) || pathname.startsWith(item.href!)}>
                <CollapsibleTrigger asChild className="w-full">
                    <SidebarMenuButton asChild={!!item.href} isActive={pathname === item.href!} className="w-full justify-between" variant="ghost" tooltip={{children: item.label}}>
                       {item.href ? (
                         <Link href={item.href} onClick={handleItemClick}>
                             <div className="flex items-center gap-2">
                                <item.icon className="h-5 w-5" />
                                <span>{item.label}</span>
                             </div>
                             <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                          </Link>
                       ) : (
                         <>
                            <div className="flex items-center gap-2">
                                <item.icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </div>
                            <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                         </>
                       )}
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu className="pl-7 pt-1">
                    {item.subItems.filter(subItem => hasAccess(subItem.roles)).map((subItem) => (
                       <SidebarMenuItem key={subItem.href}>
                         <SidebarMenuButton asChild isActive={pathname.startsWith(subItem.href!)} size="sm">
                            <Link href={subItem.href!} onClick={handleItemClick}>
                              {subItem.icon && <subItem.icon className="h-4 w-4" />}
                              <span>{subItem.label}</span>
                            </Link>
                         </SidebarMenuButton>
                       </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href!} tooltip={{children: item.label}}>
                  <Link href={item.href!} onClick={handleItemClick}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: 'Pengaturan'}}>
                  <Settings className="h-5 w-5" />
                  <span>Pengaturan</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip={{children: 'Keluar'}}>
                    <LogOut className="h-5 w-5" />
                    <span>Keluar</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
