import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const { authMock, findOrderMock, runStepMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findOrderMock: vi.fn(),
  runStepMock: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    customStoryOrder: {
      findUnique: findOrderMock,
    },
    storyStudioDraft: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/story-studio/orchestration/run-step', () => ({
  runStoryStudioStep: runStepMock,
}));

describe('POST /api/custom-stories/[id]/generate/[step]', () => {
  beforeEach(() => {
    authMock.mockReset();
    findOrderMock.mockReset();
    runStepMock.mockReset();
  });

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'ord_1', step: 'brief' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not owner/admin', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_2', role: 'user' } });
    findOrderMock.mockResolvedValue({
      id: 'ord_1',
      userId: 'user_1',
      storyStudioDraftId: 'draft_1',
    });
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'ord_1', step: 'brief' }),
    });
    expect(res.status).toBe(403);
  });
});
