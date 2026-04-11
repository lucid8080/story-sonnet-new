import { Suspense } from 'react';
import { StoryStudioClient } from '@/components/admin/story-studio/StoryStudioClient';

export default function AdminStoryStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-violet-100 bg-white p-10 text-center text-slate-600 shadow-sm">
          Loading Story Studio…
        </div>
      }
    >
      <StoryStudioClient />
    </Suspense>
  );
}
