"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const url = new URL(window.location.href);
      console.log('AuthCallback: Full URL:', url.toString());
      
      const code = searchParams.get('code');
      console.log('AuthCallback: Code present in URL:', !!code);
      
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        console.error(`AuthCallback: Cognito returned an error: ${error} - ${errorDescription}`);
        router.push(`/login?error=${error}&description=${errorDescription}`);
        return;
      }

      if (!code) {
        console.error('AuthCallback: No code found in URL. Cannot exchange for tokens.');
        router.push('/login?error=no_code');
        return;
      }

      console.log('AuthCallback: Code found, attempting token exchange...');
      
      // Set a timeout for the token exchange to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('AuthCallback: Token exchange timed out after 10 seconds.');
        router.push('/login?error=timeout');
      }, 10000);

      try {
        const session = await fetchAuthSession();
        clearTimeout(timeoutId);
        console.log('AuthCallback: Tokens exchanged successfully:', session);
        
        router.push('/');
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('AuthCallback: Token exchange failed:', error);
        router.push('/login');
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <p className="text-lg font-medium">Completing sign-in, please wait...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}

// useSearchParams must sit under a Suspense boundary for the static export build.
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallback />
    </Suspense>
  );
}
