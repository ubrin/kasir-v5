
'use client';

import * as React from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUser(null);
      }
      // We will set loading to false in the AppLayout after profile is fetched
    });
    
    return () => unsubscribeAuth();
  }, []);
  
  // This initial loading is just for the firebase user state, not the profile
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500); // Give auth state a moment to settle
    return () => clearTimeout(timer);
  }, []);


  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, setAppUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
