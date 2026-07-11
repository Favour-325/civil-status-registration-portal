import { Amplify } from 'aws-amplify';

export { Amplify };

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'phone', 'aws.cognito.signin.user.admin'],
          redirectSignIn: ['http://localhost:3001/auth/callback'],
          redirectSignOut: ['http://localhost:3001/'],
          // Without `as const` this widens to `string`, which Amplify's
          // ResourcesConfig rejects (it wants the literal 'code' | 'token').
          responseType: 'code' as const,
        }
      }
    }
  }
};
