
'use client';
import Link from 'next/link';
import { Search, Bell, User, LogOut, Download, X as XIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import * as React from 'react';

export default function Header() {
  const router = useRouter();
  const { toast } = useToast();
  const { installPrompt, canInstall } = usePwaInstall();
 
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


  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
        <SidebarTrigger />
        <div className="w-full flex-1">
          {/* Search bar is removed from here */}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Buka notifikasi</span>
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">Buka menu pengguna</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canInstall && (
                <DropdownMenuItem onClick={installPrompt}>
                <Download className="mr-2 h-4 w-4" />
                Instal Aplikasi
                </DropdownMenuItem>
            )}
            <DropdownMenuItem>Pengaturan</DropdownMenuItem>
            <DropdownMenuItem>Dukungan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </header>
  );
}
