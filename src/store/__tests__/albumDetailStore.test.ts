jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));
jest.mock('../../services/subsonicService');

import { ensureCoverArtAuth, getAlbum } from '../../services/subsonicService';
import { albumDetailStore } from '../albumDetailStore';

const mockGetAlbum = getAlbum as jest.MockedFunction<typeof getAlbum>;

beforeEach(() => {
  jest.clearAllMocks();
  albumDetailStore.getState().clearAlbums();
});

describe('albumDetailStore', () => {
  describe('fetchAlbum', () => {
    it('fetches and stores album data', async () => {
      const album = { id: 'a1', name: 'Test Album', song: [] };
      mockGetAlbum.mockResolvedValue(album as any);

      const result = await albumDetailStore.getState().fetchAlbum('a1');

      expect(ensureCoverArtAuth).toHaveBeenCalled();
      expect(mockGetAlbum).toHaveBeenCalledWith('a1');
      expect(result).toBe(album);
      expect(albumDetailStore.getState().albums['a1'].album).toBe(album);
      expect(albumDetailStore.getState().albums['a1'].retrievedAt).toBeGreaterThan(0);
    });

    it('returns null when API returns null', async () => {
      mockGetAlbum.mockResolvedValue(null);

      const result = await albumDetailStore.getState().fetchAlbum('a1');

      expect(result).toBeNull();
      expect(albumDetailStore.getState().albums['a1']).toBeUndefined();
    });

    it('preserves existing albums when fetching new one', async () => {
      const album1 = { id: 'a1', name: 'Album 1', song: [] };
      const album2 = { id: 'a2', name: 'Album 2', song: [] };
      mockGetAlbum.mockResolvedValueOnce(album1 as any).mockResolvedValueOnce(album2 as any);

      await albumDetailStore.getState().fetchAlbum('a1');
      await albumDetailStore.getState().fetchAlbum('a2');

      expect(albumDetailStore.getState().albums['a1']).toBeDefined();
      expect(albumDetailStore.getState().albums['a2']).toBeDefined();
    });
  });

  describe('clearAlbums', () => {
    it('removes all cached albums', async () => {
      mockGetAlbum.mockResolvedValue({ id: 'a1', name: 'Test', song: [] } as any);
      await albumDetailStore.getState().fetchAlbum('a1');

      albumDetailStore.getState().clearAlbums();
      expect(albumDetailStore.getState().albums).toEqual({});
    });
  });
});
