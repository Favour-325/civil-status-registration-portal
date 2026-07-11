import { Amplify } from 'aws-amplify';

export { Amplify };

// Where this build of the portal is served from. Localhost for `next dev`; the
// CloudFront URL in the deployed build (set as a GitHub Actions variable). Must
// match the admin client's callback/logout URLs in Cognito exactly.
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'phone', 'aws.cognito.signin.user.admin'],
          redirectSignIn: [`${ADMIN_URL}/auth/callback`],
          redirectSignOut: [`${ADMIN_URL}/`],
          // Without `as const` this widens to `string`, which Amplify's
          // ResourcesConfig rejects (it wants the literal 'code' | 'token').
          responseType: 'code' as const,
        }
      }
    }
  }
};
