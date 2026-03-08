jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));

import { layoutPreferencesStore } from '../layoutPreferencesStore';

beforeEach(() => {
  layoutPreferencesStore.setState({
    albumLayout: 'list',
    artistLayout: 'list',
    playlistLayout: 'list',
    favSongLayout: 'list',
    favAlbumLayout: 'list',
    favArtistLayout: 'list',
    albumSortOrder: 'artist',
    artistAlbumSortOrder: 'newest',
    dateFormat: 'yyyy/mm/dd',
  });
});

describe('layoutPreferencesStore', () => {
  it('setAlbumLayout changes album layout', () => {
    layoutPreferencesStore.getState().setAlbumLayout('grid');
    expect(layoutPreferencesStore.getState().albumLayout).toBe('grid');
  });

  it('setArtistLayout changes artist layout', () => {
    layoutPreferencesStore.getState().setArtistLayout('grid');
    expect(layoutPreferencesStore.getState().artistLayout).toBe('grid');
  });

  it('setPlaylistLayout changes playlist layout', () => {
    layoutPreferencesStore.getState().setPlaylistLayout('grid');
    expect(layoutPreferencesStore.getState().playlistLayout).toBe('grid');
  });

  it('setFavSongLayout changes fav song layout', () => {
    layoutPreferencesStore.getState().setFavSongLayout('grid');
    expect(layoutPreferencesStore.getState().favSongLayout).toBe('grid');
  });

  it('setFavAlbumLayout changes fav album layout', () => {
    layoutPreferencesStore.getState().setFavAlbumLayout('grid');
    expect(layoutPreferencesStore.getState().favAlbumLayout).toBe('grid');
  });

  it('setFavArtistLayout changes fav artist layout', () => {
    layoutPreferencesStore.getState().setFavArtistLayout('grid');
    expect(layoutPreferencesStore.getState().favArtistLayout).toBe('grid');
  });

  it('setAlbumSortOrder changes sort order', () => {
    layoutPreferencesStore.getState().setAlbumSortOrder('title');
    expect(layoutPreferencesStore.getState().albumSortOrder).toBe('title');
  });

  it('setArtistAlbumSortOrder changes artist album sort', () => {
    layoutPreferencesStore.getState().setArtistAlbumSortOrder('oldest');
    expect(layoutPreferencesStore.getState().artistAlbumSortOrder).toBe('oldest');
  });

  it('setDateFormat changes date format', () => {
    layoutPreferencesStore.getState().setDateFormat('yyyy/dd/mm');
    expect(layoutPreferencesStore.getState().dateFormat).toBe('yyyy/dd/mm');
  });
});
