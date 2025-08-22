
'use client';

import * as React from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

// This is a Higher-Order Component (HOC)
// It wraps a page component and ensures that the user is authenticated
// before the page component is rendered.

export default function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  const WithAuthComponent = (props: P) => {
    const [loading, setLoading] = React.useState(true);
    const [user, setUser] = React.useState<User | null>(null);
    const router = useRouter();

    React.useEffect(() => {
      // onAuthStateChanged is the recommended way to get the current user.
      // It's an observer that listens for changes in the user's sign-in state.
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in.
          setUser(user);
          setLoading(false);
        } else {
          // User is signed out.
          setUser(null);
          router.push('/'); // Redirect to login page
        }
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    }, [router]);

    if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      );
    }
    
    // If loading is false and there's no user, it means the redirect is in progress.
    // Returning null prevents the wrapped component from rendering.
    if (!user) {
      return null;
    }

    // If loading is finished and user is authenticated, render the page.
    return <WrappedComponent {...props} />;
  };

  WithAuthComponent.displayName = `WithAuth(${(WrappedComponent.displayName || WrappedComponent.name || 'Component')})`;

  return WithAuthComponent;
}
