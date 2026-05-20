import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearGenerationSettingsSessionCache,
  getGenerationSettingsForSession,
  getOrCreateGenerationSettings,
  updateGenerationSettings,
} from '@/lib/generation/settings';

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();

const prisma = {
  generationSettings: { findUnique, create, update },
} as never;

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
  update.mockReset();
  clearGenerationSettingsSessionCache();
});

describe('getGenerationSettingsForSession', () => {
  it('returns false when row is missing', async () => {
    findUnique.mockResolvedValue(null);
    await expect(getGenerationSettingsForSession(prisma)).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('caches the flag within the TTL', async () => {
    findUnique.mockResolvedValue({ customStoriesGlobalEnabled: true });
    await expect(getGenerationSettingsForSession(prisma)).resolves.toBe(true);
    await expect(getGenerationSettingsForSession(prisma)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});

describe('getOrCreateGenerationSettings', () => {
  it('creates when missing without upsert', async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockResolvedValue({ customStoriesGlobalEnabled: false });
    await expect(getOrCreateGenerationSettings(prisma)).resolves.toEqual({
      customStoriesGlobalEnabled: false,
    });
    expect(create).toHaveBeenCalledWith({
      data: { id: 'global' },
      select: { customStoriesGlobalEnabled: true },
    });
  });
});

describe('updateGenerationSettings', () => {
  it('updates existing row', async () => {
    findUnique.mockResolvedValue({ customStoriesGlobalEnabled: false });
    update.mockResolvedValue({ customStoriesGlobalEnabled: true });
    await expect(updateGenerationSettings(prisma, true)).resolves.toEqual({
      customStoriesGlobalEnabled: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'global' },
      data: { customStoriesGlobalEnabled: true },
      select: { customStoriesGlobalEnabled: true },
    });
  });
});
