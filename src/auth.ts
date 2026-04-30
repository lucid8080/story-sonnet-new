import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import { touchProfileLastActiveAt } from '@/lib/admin/customers/aggregates';
import { normalizeFeatureTags } from '@/lib/features/customStoriesAccessCore';
import { getOrCreateGenerationSettings } from '@/lib/generation/settings';

async function resolveCustomStoriesGlobalEnabled() {
  try {
    const row = await getOrCreateGenerationSettings(prisma);
    return row?.customStoriesGlobalEnabled ?? false;
  } catch {
    return false;
  }
}

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
      if (user?.email) {
        token.email = user.email;
      }
      if (user?.id) {
        try {
          const p = await prisma.profile.findUnique({
            where: { userId: user.id },
          });
          token.role = p?.role ?? 'user';
          token.subscriptionStatus = p?.subscriptionStatus ?? 'free';
          token.internalTags = normalizeFeatureTags(p?.internalTags);
          token.customStoriesGlobalEnabled = await resolveCustomStoriesGlobalEnabled();
        } catch (e) {
          console.warn('[auth] jwt profile fetch failed', e);
          token.role = 'user';
          token.subscriptionStatus = 'free';
          token.internalTags = [];
          token.customStoriesGlobalEnabled = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        if (token.email && typeof token.email === 'string') {
          session.user.email = token.email;
        }
        const userId = token.sub;
        if (userId) {
          try {
            await touchProfileLastActiveAt(userId);
            if (!session.user.email) {
              const u = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
              });
              if (u?.email) {
                session.user.email = u.email;
              }
            }
            const p = await prisma.profile.findUnique({
              where: { userId },
              select: { role: true, subscriptionStatus: true, internalTags: true },
            });
            session.user.role = p?.role ?? (token.role as string) ?? 'user';
            session.user.subscriptionStatus =
              p?.subscriptionStatus ??
              (token.subscriptionStatus as string) ??
              'free';
            session.user.internalTags = normalizeFeatureTags(
              p?.internalTags ?? token.internalTags
            );
            session.user.customStoriesGlobalEnabled =
              await resolveCustomStoriesGlobalEnabled();
          } catch (e) {
            console.warn('[auth] session profile fetch failed', e);
            session.user.role = (token.role as string) ?? 'user';
            session.user.subscriptionStatus =
              (token.subscriptionStatus as string) ?? 'free';
            session.user.internalTags = normalizeFeatureTags(token.internalTags);
            session.user.customStoriesGlobalEnabled = Boolean(
              token.customStoriesGlobalEnabled
            );
          }
        } else {
          session.user.role = (token.role as string) ?? 'user';
          session.user.subscriptionStatus =
            (token.subscriptionStatus as string) ?? 'free';
          session.user.internalTags = normalizeFeatureTags(token.internalTags);
          session.user.customStoriesGlobalEnabled = Boolean(
            token.customStoriesGlobalEnabled
          );
        }
        session.user.image =
          resolvePublicAssetUrl(session.user.image) ?? session.user.image;
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
      try {
        await prisma.adminInboxEvent.create({
          data: {
            type: 'user_signup',
            userId: user.id!,
            metadata: {},
          },
        });
      } catch (e) {
        console.warn('[auth] admin inbox signup event failed', e);
      }
    },
  },
});
