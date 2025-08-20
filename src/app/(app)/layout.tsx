
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, loading: authLoading, setAppUser } = useAuth();
  const [profileLoading, setProfileLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/');
    }
  }, [firebaseUser, authLoading, router]);

  React.useEffect(() => {
    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setAppUser(doc.data() as AppUser);
        } else {
          setAppUser(null);
        }
        setProfileLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setAppUser(null);
        setProfileLoading(false);
      });
      return () => unsubscribeSnapshot();
    } else if (!authLoading) {
      // If there's no firebaseUser and auth is not loading, we're done.
      setProfileLoading(false);
    }
  }, [firebaseUser, authLoading, setAppUser]);


  if (authLoading || profileLoading) {
     return (
        <div className="flex min-h-screen w-full">
            <div className="hidden md:flex flex-col gap-4 p-4 border-r bg-card">
                <Skeleton className="h-10 w-48" />
                <div className="p-2 mt-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                 <div className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
                    <Skeleton className="h-8 w-8" />
                    <div className="w-full flex-1"></div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                 </div>
                <main className="flex-1 p-4 sm:p-6 md:p-8">
                    <Skeleton className="h-96 w-full" />
                </main>
            </div>
        </div>
    );
  }

  if (!firebaseUser) {
    // This can happen briefly before the redirect effect kicks in.
    // Or if there's no user, in which case the redirect will handle it.
    return null;
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
