import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const {
  authMock,
  findOrderMock,
  findDraftMock,
  createStoryMock,
  updateDraftMock,
  updateStoryMock,
  updateOrderMock,
  upsertStoryFromAdminMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findOrderMock: vi.fn(),
  findDraftMock: vi.fn(),
  createStoryMock: vi.fn(),
  updateDraftMock: vi.fn(),
  updateStoryMock: vi.fn(),
  updateOrderMock: vi.fn(),
  upsertStoryFromAdminMock: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/story-studio/sync-linked-library-from-draft', () => ({
  buildValidatedLibraryPayloadFromDraft: vi.fn(() => ({
    ok: true,
    payload: {
      slug: 'my-story',
      seriesTitle: 'My story',
      title: 'My story',
      summary: 'Summary',
      ageRange: '6-8',
      isSeries: false,
      isPublished: true,
      isPremium: false,
      isFeatured: false,
      popularityScore: 10,
      sortPriority: 0,
      topics: [],
      characterTags: [],
      episodes: [],
    },
  })),
  storyStudioDraftIncludeForLibrary: {},
}));

vi.mock('@/lib/stories', () => ({
  upsertStoryFromAdmin: upsertStoryFromAdminMock,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    customStoryOrder: {
      findUnique: findOrderMock,
      update: updateOrderMock,
    },
    storyStudioDraft: {
      findUnique: findDraftMock,
      update: updateDraftMock,
    },
    story: {
      create: createStoryMock,
      update: updateStoryMock,
    },
  },
}));

describe('POST /api/custom-stories/[id]/push-to-library', () => {
  beforeEach(() => {
    authMock.mockReset();
    findOrderMock.mockReset();
    findDraftMock.mockReset();
    createStoryMock.mockReset();
    updateDraftMock.mockReset();
    updateStoryMock.mockReset();
    updateOrderMock.mockReset();
    upsertStoryFromAdminMock.mockReset();
  });

  it('defaults visibility to public when not provided', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });
    findOrderMock.mockResolvedValue({
      id: 'ord_1',
      userId: 'user_1',
      storyStudioDraftId: 'draft_1',
    });
    findDraftMock.mockResolvedValue({
      id: 'draft_1',
      linkedStoryId: null,
      episodes: [{ id: 'ep_1' }],
    });
    createStoryMock.mockResolvedValue({ id: BigInt(101) });
    upsertStoryFromAdminMock.mockResolvedValue({ id: BigInt(101), slug: 'my-story' });

    const res = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: 'ord_1' }),
    });

    expect(res.status).toBe(200);
    expect(createStoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ access: 'public' }),
      })
    );
    expect(updateStoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ access: 'public' }),
      })
    );
  });

  it('returns 400 for invalid visibility', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'friends-only' }),
      }),
      { params: Promise.resolve({ id: 'ord_1' }) }
    );
    expect(res.status).toBe(400);
  });

  it('allows push when episodes exist but MP3 assets are not ready', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });
    findOrderMock.mockResolvedValue({
      id: 'ord_1',
      userId: 'user_1',
      storyStudioDraftId: 'draft_1',
    });
    findDraftMock.mockResolvedValue({
      id: 'draft_1',
      linkedStoryId: null,
      episodes: [{ id: 'ep_1' }, { id: 'ep_2' }],
      assets: [],
    });
    createStoryMock.mockResolvedValue({ id: BigInt(202) });
    upsertStoryFromAdminMock.mockResolvedValue({ id: BigInt(202), slug: 'my-story' });

    const res = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: 'ord_1' }),
    });

    expect(res.status).toBe(200);
    expect(upsertStoryFromAdminMock).toHaveBeenCalledTimes(1);
    expect(updateOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });
});
