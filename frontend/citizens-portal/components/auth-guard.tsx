"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    function checkAuth() {
      const token = localStorage.getItem('session_token');
      
      if (!token) {
        console.log('AuthGuard: No session token found. Redirecting to /verify...');
        router.push('/verify');
        return;
      }
      
      console.log('AuthGuard: Valid session token found.');
      setIsLoading(false);
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Loading secure session...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
