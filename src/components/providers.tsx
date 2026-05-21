'use client';

import { SessionProvider } from 'next-auth/react';
import { StorySeriesPlayerProvider } from '@/components/story/StorySeriesPlayerProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <StorySeriesPlayerProvider>{children}</StorySeriesPlayerProvider>
    </SessionProvider>
  );
}
