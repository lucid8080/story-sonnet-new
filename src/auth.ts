import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { agentDebugLog } from '@/lib/agent-debug-log';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Return a minimal, JSON-safe user payload to avoid leaking fields
        // (like the password hash) into the JWT/session pipeline.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        try {
          const p = await prisma.profile.findUnique({
            where: { userId: user.id },
          });
          token.role = p?.role ?? 'user';
          token.subscriptionStatus = p?.subscriptionStatus ?? 'free';
        } catch (e) {
          console.warn('[auth] jwt profile fetch failed', e);
          token.role = 'user';
          token.subscriptionStatus = 'free';
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        const userId = token.sub;
        if (userId) {
          try {
            const p = await prisma.profile.findUnique({
              where: { userId },
              select: { role: true, subscriptionStatus: true },
            });
            session.user.role = p?.role ?? (token.role as string) ?? 'user';
            session.user.subscriptionStatus =
              p?.subscriptionStatus ??
              (token.subscriptionStatus as string) ??
              'free';
            // #region agent log
            agentDebugLog({
              location: 'auth.ts:session callback',
              message: 'session subscription from profile',
              hypothesisId: 'H4',
              userIdTail: userId.slice(-6),
              hasProfile: !!p,
              dbSub: p?.subscriptionStatus ?? null,
              resolvedSub: session.user.subscriptionStatus,
            });
            // #endregion
          } catch (e) {
            console.warn('[auth] session profile fetch failed', e);
            session.user.role = (token.role as string) ?? 'user';
            session.user.subscriptionStatus =
              (token.subscriptionStatus as string) ?? 'free';
            // #region agent log
            agentDebugLog({
              location: 'auth.ts:session callback catch',
              message: 'profile fetch failed using token',
              hypothesisId: 'H4',
              userIdTail: userId.slice(-6),
              tokenSub: (token.subscriptionStatus as string) ?? null,
            });
            // #endregion
          }
        } else {
          session.user.role = (token.role as string) ?? 'user';
          session.user.subscriptionStatus =
            (token.subscriptionStatus as string) ?? 'free';
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await prisma.profile.create({
        data: {
          userId: user.id!,
          fullName: user.name ?? null,
        },
      });
    },
  },
});
