/**
 * Centralised "more options" actions used by swipe gestures, long-press
 * menus, and the more-options bottom sheet.
 *
 * Keeps star/queue logic in one place so row and card components stay thin.
 */

import { favoritesStore } from '../store/favoritesStore';
import { addToQueue, removeFromQueue } from './playerService';
import {
  getAlbum,
  getPlaylist,
  starAlbum,
  starArtist,
  starSong,
  unstarAlbum,
  unstarArtist,
  unstarSong,
  type AlbumID3,
  type Child,
  type Playlist,
} from './subsonicService';

/* ------------------------------------------------------------------ */
/*  Star / Unstar                                                      */
/* ------------------------------------------------------------------ */

export type StarrableType = 'song' | 'album' | 'artist';

/**
 * Toggle the starred (favorite) state for an item and refresh the
 * favorites store so all views stay in sync.
 *
 * Returns the new starred state (`true` = now starred).
 */
export async function toggleStar(
  type: StarrableType,
  id: string,
  currentlyStarred: boolean,
): Promise<boolean> {
  const starred = !currentlyStarred;

  switch (type) {
    case 'song':
      if (starred) await starSong(id);
      else await unstarSong(id);
      break;
    case 'album':
      if (starred) await starAlbum(id);
      else await unstarAlbum(id);
      break;
    case 'artist':
      if (starred) await starArtist(id);
      else await unstarArtist(id);
      break;
  }

  favoritesStore.getState().fetchStarred();

  return starred;
}

/* ------------------------------------------------------------------ */
/*  Queue management                                                   */
/* ------------------------------------------------------------------ */

/**
 * Add a single song / track to the end of the play queue.
 */
export async function addSongToQueue(song: Child): Promise<void> {
  await addToQueue([song]);
}

/**
 * Add every song from an album to the end of the play queue.
 * Fetches the full album (with songs) from the server first.
 */
export async function addAlbumToQueue(album: AlbumID3): Promise<void> {
  const full = await getAlbum(album.id);
  if (!full?.song?.length) return;
  await addToQueue(full.song);
}

/**
 * Add every song from a playlist to the end of the play queue.
 * Fetches the full playlist (with entries) from the server first.
 */
export async function addPlaylistToQueue(playlist: Playlist): Promise<void> {
  const full = await getPlaylist(playlist.id);
  if (!full?.entry?.length) return;
  await addToQueue(full.entry);
}

/**
 * Remove a track from the play queue by its index.
 */
export async function removeItemFromQueue(index: number): Promise<void> {
  await removeFromQueue(index);
}
