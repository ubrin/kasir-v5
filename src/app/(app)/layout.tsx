
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { OfflineIndicator } from '@/components/offline-indicator';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, appUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if auth is loaded and there's no user
  React.useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/');
    }
  }, [firebaseUser, authLoading, router]);

  if (authLoading || !appUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  // If auth is loaded, firebaseUser exists but we are waiting for appUser profile, show loader.
  // This state is very brief.
  if (!appUser) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
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
