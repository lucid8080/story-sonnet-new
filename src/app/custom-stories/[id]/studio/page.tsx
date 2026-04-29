import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { serializeDraft, draftInclude } from '@/lib/story-studio/serialize-draft';
import { CustomStoriesStudioClient } from '@/components/custom-stories/studio/CustomStoriesStudioClient';

export default async function CustomStoryStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signup?callbackUrl=/custom-stories/create');
  }
  const { id } = await params;
  const order = await prisma.customStoryOrder.findUnique({
    where: { id },
    include: {
      storyStudioDraft: { include: draftInclude },
      story: { select: { access: true } },
    },
  });
  if (!order) notFound();
  const isOwner = order.userId === session.user.id;
  const isAdmin = session.user.role === 'admin';
  if (!isOwner && !isAdmin) notFound();
  if (!order.storyStudioDraft) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <CustomStoriesStudioClient
        orderId={order.id}
        orderStatus={order.status}
        initialVisibility={order.story?.access ?? 'public'}
        draft={serializeDraft(order.storyStudioDraft)}
      />
    </div>
  );
}
