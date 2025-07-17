
'use client';

import * as React from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUser(null);
        setLoading(false);
      }
    });
    
    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUser(doc.data() as AppUser);
        } else {
          // This might happen if user is created but firestore doc fails
          // Or if user data is deleted.
          setUser(null); 
        }
        setLoading(false);
      }, (error) => {
          console.error("Error fetching user data:", error);
          setUser(null);
          setLoading(false);
      });
      
      return () => unsubscribeSnapshot();
    } else {
        // No firebaseUser, so not loading.
        setLoading(false);
    }
  }, [firebaseUser]);


  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
          <Skeleton className="w-24 h-24 rounded-full" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
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
