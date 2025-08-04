
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { installPrompt, canInstall } = usePwaInstall();
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('q') || '');

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
  
  // Debounced search effect
  React.useEffect(() => {
    const handler = setTimeout(() => {
      // We only want to trigger search on the customers page for now
      if (pathname !== '/customers') return;

      const current = new URLSearchParams(Array.from(searchParams.entries()));

      if (!searchQuery.trim()) {
        current.delete('q');
      } else {
        current.set('q', searchQuery.trim());
      }
      
      const search = current.toString();
      const query = search ? `?${search}` : '';

      // Only push if the query is different
      if (`${pathname}${query}` !== `${pathname}?${searchParams.toString()}`) {
         router.push(`${pathname}${query}`);
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, pathname, router, searchParams]);

  // Sync search input with URL params on navigation
  React.useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleResetSearch = () => {
    setSearchQuery('');
    router.push('/customers');
  }


  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2">
            <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <div className="hidden md:block">
                <SidebarTrigger />
            </div>
        </div>
      <div className="w-full flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari pelanggan..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
             {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full"
                onClick={handleResetSearch}
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
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
