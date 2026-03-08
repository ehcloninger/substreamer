import { createShareStore } from '../createShareStore';

beforeEach(() => {
  createShareStore.setState({
    visible: false,
    shareType: 'album',
    itemId: null,
    songIds: [],
    itemName: '',
  });
});

describe('createShareStore', () => {
  it('showAlbum sets album share state', () => {
    createShareStore.getState().showAlbum('a1', 'My Album');
    const state = createShareStore.getState();
    expect(state.visible).toBe(true);
    expect(state.shareType).toBe('album');
    expect(state.itemId).toBe('a1');
    expect(state.itemName).toBe('My Album');
    expect(state.songIds).toEqual([]);
  });

  it('showPlaylist sets playlist share state', () => {
    createShareStore.getState().showPlaylist('p1', 'My Playlist');
    const state = createShareStore.getState();
    expect(state.visible).toBe(true);
    expect(state.shareType).toBe('playlist');
    expect(state.itemId).toBe('p1');
    expect(state.itemName).toBe('My Playlist');
  });

  it('showQueue sets queue share state', () => {
    createShareStore.getState().showQueue(['s1', 's2']);
    const state = createShareStore.getState();
    expect(state.visible).toBe(true);
    expect(state.shareType).toBe('queue');
    expect(state.itemId).toBeNull();
    expect(state.songIds).toEqual(['s1', 's2']);
    expect(state.itemName).toBe('Current Queue');
  });

  it('hide resets state', () => {
    createShareStore.getState().showAlbum('a1', 'My Album');
    createShareStore.getState().hide();
    const state = createShareStore.getState();
    expect(state.visible).toBe(false);
    expect(state.itemId).toBeNull();
    expect(state.songIds).toEqual([]);
    expect(state.itemName).toBe('');
  });
});
