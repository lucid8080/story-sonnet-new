import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from './route';

const { requireAdminMock, getOrCreateGenerationSettingsMock, upsertMock } =
  vi.hoisted(() => ({
    requireAdminMock: vi.fn(),
    getOrCreateGenerationSettingsMock: vi.fn(),
    upsertMock: vi.fn(),
  }));

vi.mock('@/lib/admin/requireAdmin', () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/generation/settings', () => ({
  getOrCreateGenerationSettings: getOrCreateGenerationSettingsMock,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    generationSettings: {
      upsert: upsertMock,
    },
  },
}));

describe('admin generation settings route', () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getOrCreateGenerationSettingsMock.mockReset();
    upsertMock.mockReset();
  });

  it('GET returns 401 when not admin', async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false }), { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET returns current global toggle state', async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: 'admin_1' } } });
    getOrCreateGenerationSettingsMock.mockResolvedValue({
      id: 'global',
      customStoriesGlobalEnabled: false,
    });
    const res = await GET();
    const json = (await res.json()) as { ok: boolean; settings: { customStoriesGlobalEnabled: boolean } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.settings.customStoriesGlobalEnabled).toBe(false);
  });

  it('PATCH validates payload', async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: 'admin_1' } } });
    const res = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ customStoriesGlobalEnabled: 'yes' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.status).toBe(422);
  });

  it('PATCH persists new toggle value', async () => {
    requireAdminMock.mockResolvedValue({ ok: true, session: { user: { id: 'admin_1' } } });
    upsertMock.mockResolvedValue({
      id: 'global',
      customStoriesGlobalEnabled: true,
    });
    const res = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ customStoriesGlobalEnabled: true }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const json = (await res.json()) as { ok: boolean; settings: { customStoriesGlobalEnabled: boolean } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.settings.customStoriesGlobalEnabled).toBe(true);
  });
});
