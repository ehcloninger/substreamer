jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));
jest.mock('../../services/subsonicService');

import { ensureCoverArtAuth, search3 } from '../../services/subsonicService';
import { searchStore } from '../searchStore';
import { offlineModeStore } from '../offlineModeStore';
import { musicCacheStore } from '../musicCacheStore';
import { albumLibraryStore } from '../albumLibraryStore';
import { playlistLibraryStore } from '../playlistLibraryStore';
import { albumDetailStore } from '../albumDetailStore';
import { playlistDetailStore } from '../playlistDetailStore';
import { favoritesStore } from '../favoritesStore';

const mockSearch3 = search3 as jest.MockedFunction<typeof search3>;

beforeEach(() => {
  jest.clearAllMocks();
  searchStore.getState().clear();
  offlineModeStore.setState({ offlineMode: false });
});

describe('searchStore', () => {
  describe('setQuery', () => {
    it('updates query text', () => {
      searchStore.getState().setQuery('radiohead');
      expect(searchStore.getState().query).toBe('radiohead');
    });
  });

  describe('performSearch — empty query', () => {
    it('clears results and does not call API', async () => {
      searchStore.setState({ query: '   ' });
      await searchStore.getState().performSearch();
      expect(mockSearch3).not.toHaveBeenCalled();
      expect(searchStore.getState().results).toEqual({
        albums: [],
        artists: [],
        songs: [],
      });
    });
  });

  describe('performSearch — online', () => {
    it('calls search3 and stores results', async () => {
      const results = {
        albums: [{ id: 'a1', name: 'Album' }],
        artists: [{ id: 'ar1', name: 'Artist' }],
        songs: [{ id: 's1', title: 'Song' }],
      };
      mockSearch3.mockResolvedValue(results as any);
      searchStore.setState({ query: 'test' });

      await searchStore.getState().performSearch();

      expect(ensureCoverArtAuth).toHaveBeenCalled();
      expect(mockSearch3).toHaveBeenCalledWith('test');
      expect(searchStore.getState().results).toEqual(results);
      expect(searchStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockSearch3.mockRejectedValue(new Error('Network error'));
      searchStore.setState({ query: 'test' });

      await searchStore.getState().performSearch();

      expect(searchStore.getState().error).toBe('Network error');
      expect(searchStore.getState().loading).toBe(false);
    });

    it('sets generic error for non-Error throws', async () => {
      mockSearch3.mockRejectedValue('string');
      searchStore.setState({ query: 'test' });
      await searchStore.getState().performSearch();
      expect(searchStore.getState().error).toBe('Search failed');
    });
  });

  describe('performSearch — offline', () => {
    it('searches cached items without calling API', async () => {
      offlineModeStore.setState({ offlineMode: true });
      musicCacheStore.setState({
        cachedItems: {
          a1: {
            name: 'Test Album',
            coverArtId: 'cover1',
            tracks: [
              { id: 't1', title: 'Matching Song', artist: 'Test Artist', duration: 200 },
              { id: 't2', title: 'Other', artist: 'Nobody', duration: 180 },
            ],
          },
        },
      } as any);
      albumLibraryStore.setState({
        albums: [{ id: 'a1', name: 'Test Album', artist: 'Test Artist' }] as any,
      });
      playlistLibraryStore.setState({ playlists: [] });
      albumDetailStore.setState({ albums: {} });
      playlistDetailStore.setState({ playlists: {} });
      favoritesStore.setState({ songs: [] } as any);
      searchStore.setState({ query: 'matching' });

      await searchStore.getState().performSearch();

      expect(mockSearch3).not.toHaveBeenCalled();
      const results = searchStore.getState().results;
      expect(results.songs).toHaveLength(1);
      expect(results.songs[0].title).toBe('Matching Song');
    });

    it('uses cover art from playlistDetail, albumDetail, and favorites', async () => {
      offlineModeStore.setState({ offlineMode: true });
      musicCacheStore.setState({
        cachedItems: {
          a1: {
            name: 'Album',
            coverArtId: 'fallback-cover',
            tracks: [
              { id: 't1', title: 'Track One', artist: 'A', duration: 200 },
            ],
          },
        },
      } as any);
      albumLibraryStore.setState({ albums: [] });
      playlistLibraryStore.setState({ playlists: [] });
      // Provide cover art from all three sources
      playlistDetailStore.setState({
        playlists: {
          p1: { playlist: { entry: [{ id: 't1', coverArt: 'playlist-cover' }] } },
        },
      } as any);
      albumDetailStore.setState({
        albums: {
          a1: { album: { song: [{ id: 't2', coverArt: 'album-cover' }] } },
        },
      } as any);
      favoritesStore.setState({
        songs: [{ id: 't3', coverArt: 'fav-cover' }],
      } as any);
      searchStore.setState({ query: 'track' });

      await searchStore.getState().performSearch();

      // t1 should get playlist-cover (last write wins: playlist → album → fav)
      const songs = searchStore.getState().results.songs;
      expect(songs).toHaveLength(1);
      expect(songs[0].coverArt).toBe('playlist-cover');
    });

    it('deduplicates songs by id', async () => {
      offlineModeStore.setState({ offlineMode: true });
      musicCacheStore.setState({
        cachedItems: {
          a1: {
            name: 'Album',
            coverArtId: 'c1',
            tracks: [
              { id: 't1', title: 'Dup Song', artist: 'A', duration: 200 },
              { id: 't1', title: 'Dup Song', artist: 'A', duration: 200 },
            ],
          },
        },
      } as any);
      albumLibraryStore.setState({ albums: [] });
      playlistLibraryStore.setState({ playlists: [] });
      albumDetailStore.setState({ albums: {} });
      playlistDetailStore.setState({ playlists: {} });
      favoritesStore.setState({ songs: [] } as any);
      searchStore.setState({ query: 'dup' });

      await searchStore.getState().performSearch();

      expect(searchStore.getState().results.songs).toHaveLength(1);
    });

    it('includes cached playlists as album-shaped results', async () => {
      offlineModeStore.setState({ offlineMode: true });
      musicCacheStore.setState({
        cachedItems: {
          p1: { name: 'My Playlist', coverArtId: 'c1', tracks: [] },
        },
      } as any);
      albumLibraryStore.setState({ albums: [] });
      playlistLibraryStore.setState({
        playlists: [
          { id: 'p1', name: 'My Playlist', owner: 'user', coverArt: 'c1', songCount: 5, duration: 1000, created: '2024-01-01' },
        ] as any,
      });
      albumDetailStore.setState({ albums: {} });
      playlistDetailStore.setState({ playlists: {} });
      favoritesStore.setState({ songs: [] } as any);
      searchStore.setState({ query: 'my' });

      await searchStore.getState().performSearch();

      const albums = searchStore.getState().results.albums;
      expect(albums.some((a) => a.id === 'p1')).toBe(true);
    });
  });

  describe('overlay and header', () => {
    it('showOverlay sets isOverlayVisible', () => {
      searchStore.getState().showOverlay();
      expect(searchStore.getState().isOverlayVisible).toBe(true);
    });

    it('hideOverlay clears isOverlayVisible', () => {
      searchStore.setState({ isOverlayVisible: true });
      searchStore.getState().hideOverlay();
      expect(searchStore.getState().isOverlayVisible).toBe(false);
    });

    it('setHeaderHeight updates height', () => {
      searchStore.getState().setHeaderHeight(64);
      expect(searchStore.getState().headerHeight).toBe(64);
    });
  });

  describe('clear', () => {
    it('resets all search state', () => {
      searchStore.setState({
        query: 'test',
        results: { albums: [{ id: 'a1' }] as any, artists: [], songs: [] },
        loading: true,
        error: 'err',
        isOverlayVisible: true,
      });
      searchStore.getState().clear();
      const state = searchStore.getState();
      expect(state.query).toBe('');
      expect(state.results).toEqual({ albums: [], artists: [], songs: [] });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isOverlayVisible).toBe(false);
    });
  });
});
