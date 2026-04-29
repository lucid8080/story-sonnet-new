import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { CustomStoriesWizard } from '@/components/custom-stories/create/CustomStoriesWizard';

export const metadata: Metadata = {
  title: `Create Custom Story | ${BRAND.productName}`,
  description: 'Build a custom audio story in a simple step-by-step wizard.',
};

export default function CustomStoriesCreatePage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/50 to-sky-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <CustomStoriesWizard />
      </div>
    </main>
  );
}
