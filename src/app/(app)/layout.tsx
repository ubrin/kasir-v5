
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { OfflineIndicator } from '@/components/offline-indicator';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, appUser, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!appUser) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Gagal memuat profil pengguna. Silakan coba login kembali.</p>
      </div>
    );
  }


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
        <OfflineIndicator />
      </div>
    </SidebarProvider>
  );
}
