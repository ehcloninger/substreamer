import { create } from 'zustand';

export type ShareTargetType = 'album' | 'playlist' | 'queue';

interface CreateShareState {
  visible: boolean;
  shareType: ShareTargetType;
  itemId: string | null;
  songIds: string[];
  itemName: string;

  showAlbum: (albumId: string, albumName: string) => void;
  showPlaylist: (playlistId: string, playlistName: string) => void;
  showQueue: (songIds: string[]) => void;
  hide: () => void;
}

export const createShareStore = create<CreateShareState>()((set) => ({
  visible: false,
  shareType: 'album',
  itemId: null,
  songIds: [],
  itemName: '',

  showAlbum: (albumId, albumName) =>
    set({
      visible: true,
      shareType: 'album',
      itemId: albumId,
      songIds: [],
      itemName: albumName,
    }),

  showPlaylist: (playlistId, playlistName) =>
    set({
      visible: true,
      shareType: 'playlist',
      itemId: playlistId,
      songIds: [],
      itemName: playlistName,
    }),

  showQueue: (songIds) =>
    set({
      visible: true,
      shareType: 'queue',
      itemId: null,
      songIds,
      itemName: 'Current Queue',
    }),

  hide: () =>
    set({
      visible: false,
      itemId: null,
      songIds: [],
      itemName: '',
    }),
}));
