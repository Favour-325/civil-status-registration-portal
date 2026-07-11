"use client";

import { signInWithRedirect } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const handleSignIn = async () => {
    try {
      await signInWithRedirect();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border rounded-lg shadow-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight">Admin Portal Login</h1>
        <p className="text-muted-foreground">
          Please sign in with your administrative credentials to access the dashboard.
        </p>
        <Button 
          onClick={handleSignIn} 
          className="w-full py-6 text-lg font-semibold"
        >
          Sign In with Cognito
        </Button>
      </div>
    </div>
  );
}
