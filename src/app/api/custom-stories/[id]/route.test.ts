import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, PATCH } from './route';

const { authMock, findOrderMock, updateStoryMock, deleteOrderMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findOrderMock: vi.fn(),
  updateStoryMock: vi.fn(),
  deleteOrderMock: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/custom-stories/service', () => ({
  getCustomStoryOrderForUser: vi.fn(),
}));

vi.mock('@/lib/custom-stories/serializers', () => ({
  serializeCustomStoryOrder: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    customStoryOrder: {
      findUnique: findOrderMock,
      delete: deleteOrderMock,
    },
    story: {
      update: updateStoryMock,
    },
  },
}));

describe('PATCH /api/custom-stories/[id]', () => {
  beforeEach(() => {
    authMock.mockReset();
    findOrderMock.mockReset();
    updateStoryMock.mockReset();
    deleteOrderMock.mockReset();
  });

  it('updates visibility for the owner', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });
    findOrderMock.mockResolvedValue({ id: 'ord_1', userId: 'user_1', storyId: BigInt(123) });
    updateStoryMock.mockResolvedValue({ access: 'private' });

    const res = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'private' }),
      }),
      { params: Promise.resolve({ id: 'ord_1' }) }
    );

    expect(res.status).toBe(200);
    expect(updateStoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ access: 'private' }),
      })
    );
  });

  it('returns 400 for invalid visibility', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });

    const res = await PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'friends-only' }),
      }),
      { params: Promise.resolve({ id: 'ord_1' }) }
    );

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/custom-stories/[id]', () => {
  beforeEach(() => {
    authMock.mockReset();
    findOrderMock.mockReset();
    deleteOrderMock.mockReset();
  });

  it('deletes an order for the owner', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });
    findOrderMock.mockResolvedValue({ id: 'ord_1', userId: 'user_1' });
    deleteOrderMock.mockResolvedValue({ id: 'ord_1' });

    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'ord_1' }) }
    );

    expect(res.status).toBe(200);
    expect(deleteOrderMock).toHaveBeenCalledWith({ where: { id: 'ord_1' } });
  });

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue(null);

    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'ord_1' }) }
    );

    expect(res.status).toBe(401);
    expect(deleteOrderMock).not.toHaveBeenCalled();
  });

  it('returns 403 when user does not own the order', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_2', role: 'user' } });
    findOrderMock.mockResolvedValue({ id: 'ord_1', userId: 'user_1' });

    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'ord_1' }) }
    );

    expect(res.status).toBe(403);
    expect(deleteOrderMock).not.toHaveBeenCalled();
  });

  it('returns 404 when order is missing', async () => {
    authMock.mockResolvedValue({ user: { id: 'user_1', role: 'user' } });
    findOrderMock.mockResolvedValue(null);

    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'ord_404' }) }
    );

    expect(res.status).toBe(404);
    expect(deleteOrderMock).not.toHaveBeenCalled();
  });
});
