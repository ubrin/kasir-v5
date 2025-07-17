
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, LayoutDashboard, Users, FileText, AlertTriangle, Settings, LogOut, Package, CreditCard, ChevronDown, BarChart3 } from 'lucide-react';
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


const menuItems = [
  { href: '/dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/delinquency', label: 'Tagihan', icon: CreditCard },
  { href: '/customers', label: 'Pelanggan', icon: Users },
  { href: '/invoices', label: 'Faktur', icon: FileText },
  { href: '/payment-report', label: 'Laporan', icon: BarChart3 },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="dark:bg-background border-r dark:border-slate-800">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 justify-start">
            <Link href="/delinquency" className="flex items-center gap-2">
                <Image src="/logo.png" alt="APLIKASI KASIR COKK Logo" width={40} height={40} />
                <h1 className="text-lg font-semibold text-foreground hidden group-data-[state=expanded]:block">APLIKASI KASIR COKK</h1>
            </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item, index) => (
            item.subItems ? (
              <Collapsible key={index} defaultOpen={item.subItems.some(sub => sub.href && pathname.startsWith(sub.href))}>
                <CollapsibleTrigger className="w-full">
                   <SidebarMenuButton className="w-full justify-between" variant="ghost" asChild={false} tooltip={{children: item.label}}>
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu className="pl-7 pt-1">
                    {item.subItems.map((subItem) => (
                       <SidebarMenuItem key={subItem.href}>
                         <SidebarMenuButton asChild isActive={pathname.startsWith(subItem.href!)} size="sm">
                            <Link href={subItem.href!}>
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
                <SidebarMenuButton asChild isActive={pathname.startsWith(item.href!)} tooltip={{children: item.label}}>
                  <Link href={item.href!}>
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
                <SidebarMenuButton asChild tooltip={{children: 'Keluar'}}>
                    <Link href="/">
                      <LogOut className="h-5 w-5" />
                      <span>Keluar</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
