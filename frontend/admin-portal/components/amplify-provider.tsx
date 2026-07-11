"use client";

import { Amplify, amplifyConfig } from '@/lib/amplify-config';

// Configure at module scope, not in an effect. Amplify.configure() is a
// synchronous global, and every consumer (AuthGuard, lib/api.ts, the login
// page's signInWithRedirect) asserts it has already run. Doing this in a
// useEffect meant children could mount and call Amplify before it was
// configured, and a throw here would strand the app on a loading spinner.
const missingVars = [
  !amplifyConfig.Auth.Cognito.userPoolId && 'NEXT_PUBLIC_USER_POOL_ID',
  !amplifyConfig.Auth.Cognito.userPoolClientId && 'NEXT_PUBLIC_USER_POOL_CLIENT_ID',
  !amplifyConfig.Auth.Cognito.loginWith.oauth.domain && 'NEXT_PUBLIC_COGNITO_DOMAIN',
].filter(Boolean);

if (missingVars.length > 0) {
  console.error(`AmplifyProvider: missing configuration: ${missingVars.join(', ')}`);
}

Amplify.configure(amplifyConfig);

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
