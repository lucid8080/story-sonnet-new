import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: string;
      subscriptionStatus: string;
      internalTags: string[];
      customStoriesGlobalEnabled: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    email?: string | null;
    role?: string;
    subscriptionStatus?: string;
    internalTags?: string[];
    customStoriesGlobalEnabled?: boolean;
  }
}
