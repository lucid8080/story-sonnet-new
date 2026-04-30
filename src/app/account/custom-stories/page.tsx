import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { resolvePublicAssetUrl } from '@/lib/resolvePublicAssetUrl';
import { CustomStoryOrderCard } from '@/components/account/CustomStoryOrderCard';
import { hasCustomStoriesAccess } from '@/lib/features/customStoriesAccessCore';
import {
  CUSTOM_STORY_PACKAGE_CONFIG,
  priceCentsForPackage,
  type CustomStoryPackageType,
} from '@/lib/custom-stories/config';

export default async function AccountCustomStoriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/account/custom-stories');
  }
  const canUseCustomStories = hasCustomStoriesAccess({
    role: session.user.role,
    internalTags: session.user.internalTags,
    customStoriesGlobalEnabled: session.user.customStoriesGlobalEnabled,
  });

  const orders = await prisma.customStoryOrder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      story: {
        include: {
          episodes: {
            orderBy: { episodeNumber: 'asc' },
            select: {
              id: true,
              episodeNumber: true,
              title: true,
              audioStorageKey: true,
              audioUrl: true,
            },
          },
        },
      },
      storyStudioDraft: {
        select: {
          seriesTitle: true,
          assets: {
            where: { kind: 'cover' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { publicUrl: true },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
          <h1 className="text-2xl font-black text-slate-900">Your custom stories</h1>
          <p className="mt-1 text-sm text-slate-600">
            Play, download, and manage your personalized story orders.
          </p>
          {canUseCustomStories ? (
            <Link
              href="/custom-stories/create"
              className="mt-4 inline-flex rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
            >
              Make story
            </Link>
          ) : (
            <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
              Custom Stories is not enabled on your account yet.
            </p>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-100">
            <p className="text-sm text-slate-600">No custom story orders yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            (() => {
              const draftCoverRaw = order.storyStudioDraft?.assets[0]?.publicUrl ?? null;
              const draftCoverUrl = resolvePublicAssetUrl(draftCoverRaw) ?? draftCoverRaw;
              const coverUrl = order.story?.coverUrl ?? draftCoverUrl ?? null;
              const storyTitle =
                order.story?.seriesTitle ??
                order.storyStudioDraft?.seriesTitle ??
                null;
              const totalEpisodes = order.story?.episodes.length ?? 0;
              const episodesWithAudio =
                order.story?.episodes.filter(
                  (ep) => !!(ep.audioStorageKey?.trim() || ep.audioUrl?.trim())
                ).length ?? 0;
              return (
                <CustomStoryOrderCard
                  key={order.id}
                  orderId={order.id}
                  storyStudioDraftId={order.storyStudioDraftId}
                  packageLabel={CUSTOM_STORY_PACKAGE_CONFIG[order.packageType as CustomStoryPackageType]?.label ?? order.packageType}
                  currentPriceCents={priceCentsForPackage(order.packageType as CustomStoryPackageType, order.episodeCount)}
                  status={order.status}
                  coverUrl={coverUrl}
                  storyTitle={storyTitle}
                  storySlug={order.story?.slug ?? null}
                  visibility={order.story?.access ?? 'public'}
                  nfcRequested={order.nfcRequested}
                  episodes={order.story?.episodes.map((ep) => ({
                    id: ep.id.toString(),
                    episodeNumber: ep.episodeNumber,
                    title: ep.title,
                  })) ?? []}
                  totalEpisodes={totalEpisodes}
                  episodesWithAudio={episodesWithAudio}
                />
              );
            })()
          ))
        )}
      </div>
    </main>
  );
}
