
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
  const { firebaseUser, loading: authLoading, appUser, setAppUser } = useAuth();
  const [profileLoading, setProfileLoading] = React.useState(true);
  const router = useRouter();

  // Effect for redirection based on auth state
  React.useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/');
    }
  }, [firebaseUser, authLoading, router]);

  // Effect for fetching user profile
  React.useEffect(() => {
    if (firebaseUser) {
      const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
        if (doc.exists()) {
          setAppUser(doc.data() as AppUser);
        } else {
          setAppUser(null); // Explicitly set to null if profile doesn't exist
        }
        setProfileLoading(false);
      });
      return () => unsub();
    } else if (!authLoading) {
      // If no Firebase user and auth is not loading, we're not expecting a profile.
      setProfileLoading(false);
    }
  }, [firebaseUser, authLoading, setAppUser]);


  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!firebaseUser || !appUser) {
    // This state can be reached briefly before redirection or if the profile is missing.
    // The redirect effect will handle routing the user away.
    // Showing a loader here is safer than returning null.
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
