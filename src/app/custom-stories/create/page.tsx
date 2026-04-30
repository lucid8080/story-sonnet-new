import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BRAND } from '@/lib/brand';
import { CustomStoriesWizard } from '@/components/custom-stories/create/CustomStoriesWizard';
import { hasCustomStoriesAccess } from '@/lib/features/customStoriesAccessCore';

export const metadata: Metadata = {
  title: `Create Custom Story | ${BRAND.productName}`,
  description: 'Build a custom audio story in a simple step-by-step wizard.',
};

export default async function CustomStoriesCreatePage() {
  const session = await auth();
  if (
    session?.user?.id &&
    !hasCustomStoriesAccess({
      role: session.user.role,
      internalTags: session.user.internalTags,
      customStoriesGlobalEnabled: session.user.customStoriesGlobalEnabled,
    })
  ) {
    redirect('/account/custom-stories');
  }

  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/50 to-sky-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={null}>
          <CustomStoriesWizard />
        </Suspense>
      </div>
    </main>
  );
}
