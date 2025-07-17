'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, LayoutDashboard, Users, FileText, AlertTriangle, Settings, LogOut, Package, CreditCard } from 'lucide-react';
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


const menuItems = [
  { href: '/dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/customers', label: 'Pelanggan', icon: Users },
  { href: '/invoices', label: 'Faktur', icon: FileText },
  { href: '/delinquency', label: 'Tagihan', icon: CreditCard },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="dark:bg-background border-r dark:border-slate-800">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2 justify-start">
            <Link href="/delinquency" className="flex items-center gap-2">
                <Image src="/logo.png" alt="PT CYBERNETWORK CORP Logo" width={40} height={40} className="h-10 w-10" />
                <h1 className="text-lg font-semibold text-foreground hidden group-data-[state=expanded]:block">PT CYBERNETWORK CORP</h1>
            </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={{children: item.label}}>
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
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

