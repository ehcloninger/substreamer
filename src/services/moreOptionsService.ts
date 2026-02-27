/**
 * Centralised "more options" actions used by swipe gestures, long-press
 * menus, and the more-options bottom sheet.
 *
 * Keeps star/queue logic in one place so row and card components stay thin.
 */

import { albumDetailStore } from '../store/albumDetailStore';
import { artistDetailStore } from '../store/artistDetailStore';
import { favoritesStore } from '../store/favoritesStore';
import { playlistDetailStore } from '../store/playlistDetailStore';
import { playlistLibraryStore } from '../store/playlistLibraryStore';
import { processingOverlayStore } from '../store/processingOverlayStore';
import { addToQueue, playTrack, removeFromQueue } from './playerService';
import {
  createNewPlaylist,
  getAlbum,
  getPlaylist,
  getSimilarSongs,
  getSimilarSongs2,
  starAlbum,
  starArtist,
  starSong,
  unstarAlbum,
  unstarArtist,
  unstarSong,
  type AlbumID3,
  type ArtistID3,
  type Child,
  type Playlist,
} from './subsonicService';

/* ------------------------------------------------------------------ */
/*  Star / Unstar                                                      */
/* ------------------------------------------------------------------ */

type StarrableType = 'song' | 'album' | 'artist';

/**
 * Toggle the starred (favorite) state for an item and refresh the
 * favorites store so all views stay in sync.
 *
 * Reads current starred state from `favoritesStore` (the single source of
 * truth) and applies an optimistic override for instant UI feedback before
 * the server round-trip completes.
 *
 * Returns the new starred state (`true` = now starred).
 */
export async function toggleStar(
  type: StarrableType,
  id: string,
): Promise<boolean> {
  const state = favoritesStore.getState();

  const currentlyStarred = (() => {
    if (id in state.overrides) return state.overrides[id];
    switch (type) {
      case 'song':
        return state.songs.some((s) => s.id === id);
      case 'album':
        return state.albums.some((a) => a.id === id);
      case 'artist':
        return state.artists.some((a) => a.id === id);
    }
  })();

  const starred = !currentlyStarred;

  // Optimistic update – UI reflects the change immediately
  state.setOverride(id, starred);

  try {
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

    // Refresh from server (clears overrides on success)
    favoritesStore.getState().fetchStarred();
  } catch {
    // Revert optimistic update on failure
    state.setOverride(id, currentlyStarred);
  }

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
 * Uses cached album data when available, otherwise fetches from the API.
 */
export async function addAlbumToQueue(album: AlbumID3): Promise<void> {
  let songs = albumDetailStore.getState().albums[album.id]?.album?.song;
  if (!songs?.length) {
    const full = await getAlbum(album.id);
    songs = full?.song;
  }
  if (!songs?.length) return;
  await addToQueue(songs);
}

/**
 * Add every song from a playlist to the end of the play queue.
 * Uses cached playlist data when available, otherwise fetches from the API.
 */
export async function addPlaylistToQueue(playlist: Playlist): Promise<void> {
  let entries = playlistDetailStore.getState().playlists[playlist.id]?.playlist?.entry;
  if (!entries?.length) {
    const full = await getPlaylist(playlist.id);
    entries = full?.entry;
  }
  if (!entries?.length) return;
  await addToQueue(entries);
}

/**
 * Remove a track from the play queue by its index.
 */
export async function removeItemFromQueue(index: number): Promise<void> {
  await removeFromQueue(index);
}

/* ------------------------------------------------------------------ */
/*  Play more like this                                                */
/* ------------------------------------------------------------------ */

/**
 * Fetch similar songs for a given track and set them as the play queue.
 * Uses processing overlay for progress, success, and error feedback.
 */
export async function playMoreLikeThis(song: Child): Promise<void> {
  processingOverlayStore.getState().show('Loading…');

  try {
    const tracks = await getSimilarSongs(song.id, 20);
    if (tracks.length === 0) {
      processingOverlayStore.getState().showError('No similar songs found');
      return;
    }

    await playTrack(tracks[0], tracks);
    processingOverlayStore.getState().showSuccess('Playing similar songs');
  } catch {
    processingOverlayStore.getState().showError('Failed to load similar songs');
  }
}

/* ------------------------------------------------------------------ */
/*  Play mix of similar artists                                        */
/* ------------------------------------------------------------------ */

/**
 * Fetch similar songs for a given artist (mix of similar artists) and set them as the play queue.
 * Uses processing overlay for progress, success, and error feedback.
 */
export async function playSimilarArtistsMix(artist: ArtistID3): Promise<void> {
  processingOverlayStore.getState().show('Loading…');

  try {
    const tracks = await getSimilarSongs2(artist.id, 20);
    if (tracks.length === 0) {
      processingOverlayStore.getState().showError('No similar artists mix available');
      return;
    }

    await playTrack(tracks[0], tracks);
    processingOverlayStore.getState().showSuccess('Playing similar artists mix');
  } catch {
    processingOverlayStore.getState().showError('Failed to load similar artists mix');
  }
}

/* ------------------------------------------------------------------ */
/*  Artist top songs playlist                                          */
/* ------------------------------------------------------------------ */

/**
 * Create a new playlist from an artist's top songs.
 * Uses cached data when available, otherwise fetches artist detail.
 * Shows processing overlay for feedback; refreshes playlist library on success.
 */
export async function saveArtistTopSongsPlaylist(artist: ArtistID3): Promise<void> {
  processingOverlayStore.getState().show('Creating…');

  try {
    let topSongs = artistDetailStore.getState().artists[artist.id]?.topSongs;
    if (!topSongs?.length) {
      const entry = await artistDetailStore.getState().fetchArtist(artist.id);
      topSongs = entry?.topSongs ?? [];
    }

    if (topSongs.length === 0) {
      processingOverlayStore.getState().showError('No top songs available');
      return;
    }

    const songIds = topSongs.map((s) => s.id);
    const success = await createNewPlaylist(`${artist.name} Top Songs`, songIds);
    if (!success) {
      processingOverlayStore.getState().showError('Failed to create playlist');
      return;
    }

    await playlistLibraryStore.getState().fetchAllPlaylists();
    processingOverlayStore.getState().showSuccess('Playlist Created');
  } catch {
    processingOverlayStore.getState().showError('Failed to create playlist');
  }
}

/* ------------------------------------------------------------------ */
/*  Download management                                                */
/* ------------------------------------------------------------------ */

export { enqueueAlbumDownload, enqueuePlaylistDownload } from './musicCacheService';

export { deleteCachedItem as removeDownload, cancelDownload } from './musicCacheService';
