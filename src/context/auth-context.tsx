
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
        // Handle anonymous users who won't have a Firestore document.
        if (firebaseUser.isAnonymous) {
            const anonymousUser: AppUser = {
                uid: firebaseUser.uid,
                email: null,
                firstName: 'Tamu',
                lastName: '',
                role: 'user', // Anonymous users are treated as 'user' role
            };
            setUser(anonymousUser);
            setLoading(false);
            return;
        }

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUser(doc.data() as AppUser);
        } else {
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
