"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      console.log('AuthGuard: Checking session...');
      
      // Set a timeout to prevent infinite loading if the promise hangs
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('AuthGuard: Session check timed out. Redirecting to login...');
          router.push('/login');
        }
      }, 5000);

      try {
        const session = await fetchAuthSession();
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (!session || !session.tokens) {
          console.log('AuthGuard: No active session tokens found. Redirecting to login...');
          router.push('/login');
          return;
        }
        
        console.log('AuthGuard: Valid session found.');
        setIsLoading(false);
      } catch (error) {
        clearTimeout(timeoutId);
        if (isMounted) {
          console.error('AuthGuard: Authentication error:', error);
          router.push('/login');
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Loading session...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
