'use client';

import { SessionProvider } from 'next-auth/react';
import { StorySeriesPlayerProvider } from '@/components/story/StorySeriesPlayerProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StorySeriesPlayerProvider>{children}</StorySeriesPlayerProvider>
    </SessionProvider>
  );
}
